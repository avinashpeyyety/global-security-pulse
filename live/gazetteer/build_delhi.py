"""Builds gazetteer/delhi.json (run once; the JSON is the artifact). Coordinates are
approximate centroids (OSM-derived knowledge, ~200-500 m), no paid geocoder.
Row: name, kind, lat, lon, aliases (| separated; Hindi included where common)."""
import json, re, pathlib
ROWS = """
Connaught Place|landmark|28.6315|77.2167|Rajiv Chowk|कनॉट प्लेस
Rajiv Chowk Metro|station|28.6328|77.2197|Rajiv Chowk metro
Janpath|road|28.6250|77.2187|जनपथ
Jantar Mantar|landmark|28.6271|77.2166|जंतर मंतर
India Gate|landmark|28.6129|77.2295|इंडिया गेट
Kartavya Path|road|28.6140|77.2190|Rajpath|कर्तव्य पथ
Rashtrapati Bhavan|landmark|28.6143|77.1994|राष्ट्रपति भवन
Parliament House|landmark|28.6172|77.2081|Parliament|Sansad Bhavan|संसद भवन|संसद
North Block|landmark|28.6155|77.2063
Vijay Chowk|landmark|28.6156|77.2087
Red Fort|landmark|28.6562|77.2410|Lal Qila|लाल किला
Chandni Chowk|locality|28.6506|77.2303|चांदनी चौक
Jama Masjid|landmark|28.6507|77.2334|जामा मस्जिद
Daryaganj|locality|28.6430|77.2400|दरियागंज
Old Delhi|locality|28.6550|77.2300|Purani Dilli|पुरानी दिल्ली
Kashmere Gate|locality|28.6675|77.2280|Kashmiri Gate|ISBT Kashmere Gate|कश्मीरी गेट
Sadar Bazar|locality|28.6580|77.2120|सदर बाजार
Paharganj|locality|28.6448|77.2127|पहाड़गंज
New Delhi Railway Station|station|28.6430|77.2193|NDLS|नई दिल्ली रेलवे स्टेशन
Old Delhi Railway Station|station|28.6610|77.2272|Delhi Junction
Karol Bagh|locality|28.6519|77.1909|करोल बाग
Rajendra Place|locality|28.6420|77.1780
Patel Nagar|locality|28.6500|77.1640|पटेल नगर
Jhandewalan|locality|28.6440|77.2010
ITO|landmark|28.6280|77.2410|आईटीओ
Pragati Maidan|landmark|28.6185|77.2440|Bharat Mandapam|प्रगति मैदान
Delhi Police HQ|landmark|28.6250|77.2380|Police Headquarters
Mandi House|landmark|28.6258|77.2340
Bengali Market|locality|28.6290|77.2310
Barakhamba Road|road|28.6300|77.2250
Gole Market|locality|28.6345|77.2050
Mandir Marg|road|28.6350|77.2000
Ram Lila Maidan|landmark|28.6400|77.2310|Ramlila Maidan|रामलीला मैदान
Delhi Gate|landmark|28.6400|77.2405
Rajghat|landmark|28.6407|77.2495|Raj Ghat|राजघाट
Feroz Shah Kotla|landmark|28.6379|77.2432|Arun Jaitley Stadium
Chanakyapuri|locality|28.5960|77.1870|चाणक्यपुरी
Khan Market|locality|28.6002|77.2270|खान मार्केट
Lodhi Road|road|28.5910|77.2270|Lodhi Colony|लोधी रोड
Lodhi Garden|landmark|28.5933|77.2197
Nizamuddin|locality|28.5890|77.2440|Hazrat Nizamuddin|निजामुद्दीन
Hazrat Nizamuddin Railway Station|station|28.5880|77.2530|Nizamuddin station
Humayun's Tomb|landmark|28.5933|77.2507|Humayun Tomb
Sarai Kale Khan|locality|28.5890|77.2580|ISBT Sarai Kale Khan|सराय काले खां
Ashram Chowk|locality|28.5720|77.2580
Lajpat Nagar|locality|28.5677|77.2433|लाजपत नगर
Defence Colony|locality|28.5720|77.2310|डिफेंस कॉलोनी
Jangpura|locality|28.5830|77.2410
Bhogal|locality|28.5840|77.2470
South Extension|locality|28.5690|77.2200|South Ex
AIIMS|landmark|28.5672|77.2100|एम्स
Safdarjung Hospital|landmark|28.5685|77.2060|Safdarjung
INA|locality|28.5750|77.2090|INA Market|Dilli Haat
Sarojini Nagar|locality|28.5770|77.1960|सरोजिनी नगर
RK Puram|locality|28.5660|77.1760|R.K. Puram|आरके पुरम
Vasant Vihar|locality|28.5600|77.1600|वसंत विहार
Munirka|locality|28.5570|77.1730|मुनिरका
JNU|landmark|28.5402|77.1662|Jawaharlal Nehru University|जेएनयू
IIT Delhi|landmark|28.5450|77.1926
Hauz Khas|locality|28.5494|77.2001|हौज खास
Green Park|locality|28.5590|77.2070
Malviya Nagar|locality|28.5330|77.2090|मालवीय नगर
Saket|locality|28.5245|77.2066|साकेत
Select Citywalk|landmark|28.5286|77.2190
Mehrauli|locality|28.5183|77.1854|महरौली
Qutub Minar|landmark|28.5245|77.1855|Qutab Minar|कुतुब मीनार
Chhatarpur|locality|28.4950|77.1790|छतरपुर
Vasant Kunj|locality|28.5200|77.1580|वसंत कुंज
Mahipalpur|locality|28.5440|77.1260|महिपालपुर
IGI Airport|landmark|28.5562|77.1000|Delhi Airport|IGI airport|Indira Gandhi International Airport|Terminal 3|एयरपोर्ट
Aerocity|locality|28.5490|77.1210
Dhaula Kuan|landmark|28.5918|77.1617|Dhaula Kuan Flyover|धौला कुआं
Delhi Cantonment|locality|28.5950|77.1350|Delhi Cantt|दिल्ली कैंट
Palam|locality|28.5890|77.0880|पालम
Dwarka|locality|28.5921|77.0460|द्वारका
Dwarka Expressway|road|28.5300|77.0300
Uttam Nagar|locality|28.6210|77.0550|उत्तम नगर
Janakpuri|locality|28.6219|77.0878|जनकपुरी
Vikaspuri|locality|28.6400|77.0690
Tilak Nagar|locality|28.6400|77.0960|तिलक नगर
Rajouri Garden|locality|28.6490|77.1220|राजौरी गार्डन
Punjabi Bagh|locality|28.6680|77.1310|पंजाबी बाग
Paschim Vihar|locality|28.6700|77.1000|पश्चिम विहार
Nangloi|locality|28.6800|77.0640|नांगलोई
Mundka|locality|28.6830|77.0300|मुंडका
Tikri Border|border|28.6890|76.9920|Tikri|टीकरी बॉर्डर
Najafgarh|locality|28.6090|76.9790|नजफगढ़
Bawana|locality|28.7990|77.0330|बवाना
Narela|locality|28.8530|77.0920|नरेला
Alipur|locality|28.7980|77.1340|अलीपुर
Singhu Border|border|28.8460|77.1040|Singhu|सिंघु बॉर्डर
Rohini|locality|28.7383|77.0822|रोहिणी
Pitampura|locality|28.6980|77.1380|पीतमपुरा
Shalimar Bagh|locality|28.7170|77.1630|शालीमार बाग
Ashok Vihar|locality|28.6900|77.1760|अशोक विहार
Azadpur|locality|28.7070|77.1800|Azadpur Mandi|आजादपुर
Jahangirpuri|locality|28.7260|77.1630|जहांगीरपुरी
Adarsh Nagar|locality|28.7150|77.1720
Model Town|locality|28.7030|77.1940|मॉडल टाउन
Mukherjee Nagar|locality|28.7060|77.2060|मुखर्जी नगर
GTB Nagar|locality|28.6980|77.2070
Delhi University|landmark|28.6890|77.2100|DU|North Campus|दिल्ली विश्वविद्यालय
Burari|locality|28.7520|77.1980|बुराड़ी
Civil Lines|locality|28.6810|77.2240|सिविल लाइंस
Majnu ka Tilla|locality|28.7010|77.2280
Wazirabad|locality|28.7140|77.2330|वजीराबाद
Timarpur|locality|28.7050|77.2230
Shastri Park|locality|28.6720|77.2500
Seelampur|locality|28.6700|77.2660|सीलमपुर
Jaffrabad|locality|28.6820|77.2730|जाफराबाद
Maujpur|locality|28.6870|77.2800|मौजपुर
Bhajanpura|locality|28.7020|77.2610|भजनपुरा
Khajuri Khas|locality|28.7120|77.2620
Mustafabad|locality|28.7110|77.2830|मुस्तफाबाद
Karawal Nagar|locality|28.7300|77.2790|करावल नगर
Gokulpuri|locality|28.7020|77.2930|गोकुलपुरी
Shiv Vihar|locality|28.7090|77.3030
Seemapuri|locality|28.6850|77.3200|सीमापुरी
Dilshad Garden|locality|28.6820|77.3170|दिलशाद गार्डन
Shahdara|locality|28.6730|77.2890|शाहदरा
Vivek Vihar|locality|28.6720|77.3120|विवेक विहार
Anand Vihar|locality|28.6470|77.3160|Anand Vihar ISBT|आनंद विहार
Preet Vihar|locality|28.6410|77.2950
Laxmi Nagar|locality|28.6310|77.2770|लक्ष्मी नगर
Shakarpur|locality|28.6300|77.2830
Mayur Vihar|locality|28.6080|77.2930|मयूर विहार
Patparganj|locality|28.6200|77.3000
Akshardham|landmark|28.6127|77.2773|अक्षरधाम
Ghazipur|locality|28.6240|77.3260|Ghazipur landfill|गाजीपुर
Ghazipur Border|border|28.6290|77.3330|UP Gate|गाजीपुर बॉर्डर
Kondli|locality|28.6170|77.3240
Trilokpuri|locality|28.6130|77.3080|त्रिलोकपुरी
DND Flyway|border|28.5800|77.2900|DND|डीएनडी
Chilla Border|border|28.5970|77.3120|Chilla|चिल्ला बॉर्डर
Kalindi Kunj|border|28.5450|77.3070|कालिंदी कुंज
Shaheen Bagh|locality|28.5470|77.2970|शाहीन बाग
Jamia Nagar|locality|28.5620|77.2830|Jamia|Jamia Millia|Batla House|जामिया
Okhla|locality|28.5550|77.2710|ओखला
Okhla Industrial Area|locality|28.5310|77.2720
Jasola|locality|28.5390|77.2900
Sarita Vihar|locality|28.5310|77.2930
Badarpur|locality|28.4950|77.3030|बदरपुर
Badarpur Border|border|28.4890|77.3080
Tughlakabad|locality|28.4840|77.2610|तुगलकाबाद
Sangam Vihar|locality|28.4980|77.2460|संगम विहार
Govindpuri|locality|28.5350|77.2650|गोविंदपुरी
Kalkaji|locality|28.5390|77.2580|कालकाजी
Nehru Place|locality|28.5491|77.2533|नेहरू प्लेस
Greater Kailash|locality|28.5480|77.2380|ग्रेटर कैलाश
Chirag Delhi|locality|28.5390|77.2250
Lotus Temple|landmark|28.5535|77.2588
Moolchand|landmark|28.5650|77.2340
Sarai Rohilla|station|28.6640|77.1860
Mangolpuri|locality|28.6950|77.0830|मंगोलपुरी
Sultanpuri|locality|28.6950|77.0700|सुल्तानपुरी
Kirari|locality|28.7020|77.0440
Prem Nagar|locality|28.6880|77.0490
Bhalswa|locality|28.7430|77.1630|Bhalswa landfill|भलस्वा
Mukundpur|locality|28.7330|77.1750
Mayapuri|locality|28.6340|77.1250|मायापुरी
Naraina|locality|28.6310|77.1420|नारायणा
Kirti Nagar|locality|28.6560|77.1440|कीर्ति नगर
Moti Nagar|locality|28.6580|77.1560
Anand Parbat|locality|28.6580|77.1730
Ring Road|road|28.5800|77.2300|रिंग रोड
Outer Ring Road|road|28.7000|77.1200
Noida|city|28.5355|77.3910|नोएडा
Noida Sector 18|locality|28.5700|77.3260
Noida Film City|landmark|28.5720|77.3190|Film City
Greater Noida|city|28.4744|77.5040|ग्रेटर नोएडा
Ghaziabad|city|28.6692|77.4538|गाजियाबाद
Vaishali|locality|28.6450|77.3390
Indirapuram|locality|28.6410|77.3710
Gurugram|city|28.4595|77.0266|Gurgaon|गुरुग्राम|गुड़गांव
Sirhaul Border|border|28.4970|77.0870|Sirhaul|Delhi-Gurugram border|सरहौल
Cyber City|locality|28.4950|77.0890|Cyber Hub|DLF Cyber City
Faridabad|city|28.4089|77.3178|फरीदाबाद
Bahadurgarh|city|28.6920|76.9240|बहादुरगढ़
Delhi Secretariat|landmark|28.6280|77.2420
Tis Hazari Court|landmark|28.6670|77.2160|Tis Hazari
Patiala House Court|landmark|28.6170|77.2360|Patiala House
Saket Court|landmark|28.5210|77.2140
Tihar Jail|landmark|28.6280|77.0980|Tihar|तिहाड़
Yamuna Bank|landmark|28.6230|77.2690
ISBT Kashmere Gate|station|28.6680|77.2300
Kashmere Gate Metro|station|28.6670|77.2280
Kingsway Camp|locality|28.7050|77.2000
Sabzi Mandi|locality|28.6700|77.1990
Gandhi Nagar|locality|28.6620|77.2690|गांधी नगर
Krishna Nagar|locality|28.6560|77.2900
Geeta Colony|locality|28.6560|77.2720
"""
def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
places, seen = [], set()
for line in ROWS.strip().splitlines():
    f = [x.strip() for x in line.split("|")]
    name, kind, lat, lon, aliases = f[0], f[1], float(f[2]), float(f[3]), [a for a in f[4:] if a]
    pid = slug(name)
    assert pid not in seen, pid; seen.add(pid)
    places.append({"id": pid, "name": name, "kind": kind, "lat": lat, "lon": lon, "aliases": aliases})
out = pathlib.Path(__file__).with_name("delhi.json")
out.write_text(json.dumps({"city": "delhi", "source": "hand-built gazetteer (approx. centroids, OSM-derived knowledge); no paid geocoder",
                           "places": places}, ensure_ascii=False, indent=1))
print(len(places), "places ->", out)
