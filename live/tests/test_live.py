"""python -m unittest discover -s live/tests -t live   (from repo root)"""
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

LIVE = Path(__file__).resolve().parents[1]
REPO = LIVE.parent

from gsp_live import grok
from gsp_live.cluster import build_incidents, corroboration, decay, iso
from gsp_live.config import load_city
from gsp_live.extract import classify, extract_post, severity
from gsp_live.gazetteer import Gazetteer

CFG = load_city("delhi")
GAZ = Gazetteer.load(LIVE / CFG["gazetteer"], CFG["bounds"])
NOW = datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc)


def post(pid, text, author="someone", mins=10, verified=False):
    return {"postId": pid, "author": author, "text": text, "verified": verified,
            "observedAt": iso(NOW - timedelta(minutes=mins))}


class TestGazetteer(unittest.TestCase):
    def test_size_and_bounds(self):
        self.assertGreaterEqual(len(GAZ.places), 150)
        for p in GAZ.places:
            self.assertTrue(GAZ.in_bounds(p["lat"], p["lon"]), p["name"])

    def test_english_hindi_hashtag(self):
        self.assertEqual(GAZ.geocode("fire near Connaught Place now").place["id"], "connaught-place")
        self.assertEqual(GAZ.geocode("चांदनी चौक में आग").place["id"], "chandni-chowk")
        self.assertEqual(GAZ.geocode("#ShaheenBagh protest").place["id"], "shaheen-bagh")
        self.assertEqual(GAZ.geocode("traffic at singhu border").place["id"], "singhu-border")

    def test_specific_beats_city(self):
        # Noida (city) vs Film City (landmark): landmark wins
        self.assertEqual(GAZ.geocode("jam near Film City in Noida").place["id"], "noida-film-city")

    def test_word_boundaries(self):
        self.assertIsNone(GAZ.geocode("the guitarist played well"))  # no 'ITO' inside words
        self.assertIsNone(GAZ.geocode("Mumbai rains"))

    def test_lookup(self):
        self.assertEqual(GAZ.lookup("Karol Bagh")["id"], "karol-bagh")
        self.assertEqual(GAZ.lookup("near jantar mantar, new delhi")["id"], "jantar-mantar")
        self.assertIsNone(GAZ.lookup(None))


class TestExtract(unittest.TestCase):
    def test_types(self):
        self.assertEqual(classify("Loud blast heard in Karol Bagh")[0], "blast")
        self.assertEqual(classify("दिल्ली में धमाका")[0], "blast")
        self.assertEqual(classify("massive fire at a factory")[0], "fire")
        self.assertEqual(classify("प्रदर्शन जंतर मंतर पर")[0], "protest")
        self.assertEqual(classify("stampede at the station")[0], "stampede")
        self.assertEqual(classify("AQI 450 smog alert")[0], "aqi")

    def test_negatives(self):
        self.assertIsNone(classify("Ceasefire talks continue")[0])
        self.assertNotEqual(classify("the minister is under fire for comments")[0], "fire")

    def test_severity(self):
        self.assertEqual(severity("fire in a shop", "fire"), 3)
        self.assertEqual(severity("explosion, 3 people killed and several injured", "blast"), 5)
        self.assertEqual(severity("mock drill: fire tenders at AIIMS", "fire"), 1)
        self.assertEqual(severity("AQI 432 severe", "aqi"), 4)
        self.assertEqual(severity("traffic jam", "traffic"), 1)

    def test_extract_post_place_and_trust(self):
        o = extract_post(post("1", "Fire breaks out in Chandni Chowk shop", "ANI", verified=True), GAZ, CFG)
        self.assertEqual((o["type"], o["place_id"], o["precision"]), ("fire", "chandni-chowk", "place"))
        self.assertTrue(o["trusted"] and o["verified"])
        self.assertEqual(o["url"], "https://x.com/ANI/status/1")

    def test_city_level_and_rejects(self):
        o = extract_post(post("2", "Protest march in Delhi today over fuel prices"), GAZ, CFG)
        self.assertEqual(o["precision"], "city")
        self.assertIsNone(extract_post(post("3", "Protest in Mumbai today"), GAZ, CFG))
        self.assertIsNone(extract_post(post("4", "Delhi is lovely this time of year"), GAZ, CFG))

    def test_grok_override(self):
        o = extract_post(post("5", "something happened near CP, lots of smoke"), GAZ, CFG,
                         {"is_incident": True, "type": "fire", "place": "Connaught Place", "severity": 3})
        self.assertEqual((o["type"], o["place_id"], o["severity"], o["source"]), ("fire", "connaught-place", 3, "grok"))
        self.assertIsNone(extract_post(post("6", "fire at Karol Bagh"), GAZ, CFG, {"is_incident": False}))


class TestCluster(unittest.TestCase):
    def obs(self, rows):
        return [o for r in rows if (o := extract_post(r, GAZ, CFG))]

    def test_merge_same_place_and_family(self):
        rows = [post("a", "fire in Chandni Chowk market", "u1", 50),
                post("b", "चांदनी चौक में आग", "u2", 40),
                post("c", "Fire breaks out near Chandni Chowk, 10 fire tenders", "ANI", 30, True),
                post("d", "protest at Jantar Mantar", "u3", 20)]
        incs = build_incidents(self.obs(rows), CFG, NOW)
        self.assertEqual(len(incs), 2)
        fire = next(i for i in incs if i["type"] == "fire")
        self.assertEqual(fire["n_posts"], 3)
        self.assertEqual(fire["corroboration"]["accounts"], 3)
        self.assertEqual(fire["corroboration"]["trusted"], 1)
        self.assertEqual(fire["place_id"], "chandni-chowk")

    def test_split_by_distance_and_time(self):
        rows = [post("a", "fire in Chandni Chowk", "u1", 30), post("b", "fire in Saket mall", "u2", 25),
                post("c", "fire in Chandni Chowk again", "u3", 60 * 8)]
        incs = build_incidents(self.obs(rows), CFG, NOW)
        self.assertEqual(len(incs), 3)

    def test_city_chatter_attaches_to_place_incident(self):
        rows = [post("a", "Blast in Karol Bagh market", "u1", 20), post("b", "Explosion heard in Delhi, what happened?", "u2", 15)]
        incs = build_incidents(self.obs(rows), CFG, NOW)
        self.assertEqual(len(incs), 1)
        self.assertEqual(incs[0]["precision"], "place")
        self.assertEqual(incs[0]["n_posts"], 2)

    def test_corroboration_and_decay(self):
        c = corroboration([{"author": "a"}, {"author": "A"}, {"author": "b", "verified": True}, {"author": "ani", "trusted": True}])
        self.assertEqual((c["accounts"], c["verified"], c["trusted"]), (3, 1, 1))
        self.assertAlmostEqual(c["raw"], 3 + 0.5 + 2)
        self.assertAlmostEqual(decay(NOW - timedelta(hours=6), NOW, 6), 0.5, places=3)
        old = build_incidents(self.obs([post("z", "fire in Saket", "u", 60 * 40)]), CFG, NOW)
        self.assertEqual(old, [])  # decayed below min_weight

    def test_fixture_end_to_end(self):
        from gsp_live.collect import load_fixture
        rows = load_fixture(LIVE / "tests/fixtures/delhi_posts.json", NOW)
        incs = build_incidents(self.obs(rows), CFG, NOW)
        places = {i["place_id"] for i in incs}
        for pid in ("chandni-chowk", "jantar-mantar", "seelampur", "karol-bagh", "dnd-flyway"):
            self.assertIn(pid, places)
        texts = {p["post_id"] for i in incs for p in i["posts"]}
        self.assertNotIn("fx1070", texts)  # "song is fire"
        self.assertNotIn("fx1071", texts)  # ceasefire
        kb = next(i for i in incs if i["place_id"] == "karol-bagh")
        self.assertEqual(kb["severity"], 5)


class TestGrokParse(unittest.TestCase):
    def test_parse(self):
        reply = 'Here you go:\n```json\n[{"id": "1", "is_incident": true, "type": "fire", "place": "Saket", "severity": 3},' \
                ' {"id": "2", "is_incident": false, "type": "bogus"}]\n```'
        a = grok.parse_reply(reply)
        self.assertEqual(a["1"]["type"], "fire")
        self.assertFalse(a["2"]["is_incident"])
        self.assertIsNone(a["2"]["type"])
        self.assertEqual(grok.parse_reply("no json"), {})

    def test_prompt(self):
        p = grok.build_prompt([{"postId": "9", "author": "x", "text": "fire in Saket"}], "Delhi NCR")
        self.assertIn('"id": "9"', p)
        self.assertIn("JSON array", p)


class TestPrivacy(unittest.TestCase):
    def test_not_published(self):
        """Pages builds apps/web only; live/ must never land in apps/web/public, and private/ is ignored."""
        self.assertFalse((REPO / "apps/web/public/live").exists())
        gi = (REPO / ".gitignore").read_text()
        self.assertIn("live/private/", gi)
        pages = (REPO / ".github/workflows/pages.yml").read_text()
        self.assertIn("path: apps/web/dist", pages)
        self.assertNotIn("live/", (REPO / "apps/web/vite.config.ts").read_text())

    def test_server_binds_localhost(self):
        from gsp_live import server
        self.assertEqual(server.HOST, "127.0.0.1")

    def test_fixture_dir_separate(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["GSP_LIVE_PRIVATE"] = td
            try:
                from gsp_live.config import city_dir
                self.assertNotEqual(city_dir("delhi"), city_dir("delhi", fixture=True))
            finally:
                del os.environ["GSP_LIVE_PRIVATE"]


if __name__ == "__main__":
    unittest.main()
