/**
 * Impact-first place → lat/lon/region helper for RSS / X-scroll / normalize.
 * Prefer title impact hits over summary; never pin Global [20,0] jitter.
 * Map markers require place coords + kinetic/impact language (mapEligible).
 * Diplomacy, elections, welfare, metaphor 'earthquake', generic UKMTO/VRA PDFs stay off-map.
 * Maritime basins pin to coastal landfall / chokepoint shore (MARITIME_LANDFALL), not open ocean.
 */

/** @typedef {{ lat: number, lon: number, region: string, place: string }} PlaceHit */
/** @typedef {PlaceHit & { matchedFrom: string, mapEligible?: boolean }} GeoResolve */

/** Longer / more specific phrases first so "Saudi capital" / "Bab el-Mandeb" win. */
const PLACES = [
  { keys: ['bab el-mandeb', 'bab el mandeb', 'bab-el-mandeb'], lat: 12.58, lon: 43.33, region: 'Red Sea / Bab el-Mandeb', place: 'Bab el-Mandeb' },
  { keys: ['strait of hormuz', 'hormuz'], lat: 27.18, lon: 56.28, region: 'Persian Gulf', place: 'Strait of Hormuz' },
  { keys: ['red sea'], lat: 12.6, lon: 43.3, region: 'Red Sea / Bab el-Mandeb', place: 'Red Sea' },
  { keys: ['black sea'], lat: 44.6, lon: 33.5, region: 'Eastern Europe', place: 'Black Sea' },
  { keys: ['saudi capital', 'riyadh'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Riyadh' },
  { keys: ['yanbu'], lat: 24.09, lon: 38.06, region: 'Middle East', place: 'Yanbu' },
  { keys: ['aramco', 'dhahran', 'ras tanura'], lat: 26.3, lon: 50.15, region: 'Middle East', place: 'Aramco / Dhahran' },
  { keys: ['jeddah', 'jiddah'], lat: 21.49, lon: 39.19, region: 'Middle East', place: 'Jeddah' },
  { keys: ['mecca', 'makkah'], lat: 21.39, lon: 39.86, region: 'Middle East', place: 'Mecca' },
  { keys: ['saudi arabia', 'saudi', 'saudis'], lat: 24.71, lon: 46.68, region: 'Middle East', place: 'Saudi Arabia' },
  { keys: ['doha', 'qatar', 'qatari'], lat: 25.29, lon: 51.53, region: 'Middle East', place: 'Qatar' },
  { keys: ['moscow', 'moskva'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Moscow' },
  { keys: ['st petersburg', 'saint petersburg', 'leningrad'], lat: 59.93, lon: 30.33, region: 'Europe', place: 'St Petersburg' },
  { keys: ['kupiansk', 'kupyansk'], lat: 49.71, lon: 37.62, region: 'Eastern Europe', place: 'Kupiansk' },
  { keys: ['kharkiv', 'kharkov'], lat: 49.99, lon: 36.23, region: 'Eastern Europe', place: 'Kharkiv' },
  { keys: ['kherson'], lat: 46.64, lon: 32.62, region: 'Eastern Europe', place: 'Kherson' },
  { keys: ['zaporizhzhia', 'zaporizhia', 'zaporozhye'], lat: 47.84, lon: 35.14, region: 'Eastern Europe', place: 'Zaporizhzhia' },
  { keys: ['mariupol'], lat: 47.1, lon: 37.55, region: 'Eastern Europe', place: 'Mariupol' },
  { keys: ['lviv', 'lvov'], lat: 49.84, lon: 24.03, region: 'Eastern Europe', place: 'Lviv' },
  { keys: ['kyiv', 'kiev'], lat: 50.45, lon: 30.52, region: 'Eastern Europe', place: 'Kyiv' },
  { keys: ['odessa', 'odesa'], lat: 46.48, lon: 30.73, region: 'Eastern Europe', place: 'Odesa' },
  { keys: ['donetsk', 'donbas', 'donbass'], lat: 48.0, lon: 37.8, region: 'Eastern Europe', place: 'Donbas' },
  { keys: ['crimea', 'sevastopol'], lat: 44.95, lon: 34.1, region: 'Eastern Europe', place: 'Crimea' },
  { keys: ['tel aviv', 'tel-aviv'], lat: 32.09, lon: 34.78, region: 'Middle East', place: 'Tel Aviv' },
  { keys: ['jerusalem'], lat: 31.78, lon: 35.22, region: 'Middle East', place: 'Jerusalem' },
  { keys: ['tehran'], lat: 35.69, lon: 51.39, region: 'Middle East', place: 'Tehran' },
  { keys: ['bandar abbas'], lat: 27.18, lon: 56.28, region: 'Persian Gulf', place: 'Bandar Abbas' },
  { keys: ['iran', 'iranian', 'irgc'], lat: 32.43, lon: 53.69, region: 'Middle East', place: 'Iran' },
  { keys: ['taipei'], lat: 25.03, lon: 121.57, region: 'East / SE Asia', place: 'Taipei' },
  { keys: ['taiwan', 'taiwan strait'], lat: 23.7, lon: 121.0, region: 'East / SE Asia', place: 'Taiwan' },
  { keys: ['beijing', 'peking'], lat: 39.9, lon: 116.4, region: 'East / SE Asia', place: 'Beijing' },
  { keys: ['south china sea'], lat: 16.5, lon: 112.5, region: 'East / SE Asia', place: 'South China Sea' },
  { keys: ['washington', 'white house', 'pentagon'], lat: 38.91, lon: -77.04, region: 'Americas', place: 'Washington' },
  { keys: ['louisiana', 'new orleans', 'baton rouge'], lat: 30.98, lon: -91.96, region: 'Americas', place: 'Louisiana' },
  { keys: ['greenland'], lat: 72.0, lon: -40.0, region: 'Americas', place: 'Greenland' },
  { keys: ['gaza', 'rafah', 'khan younis'], lat: 31.5, lon: 34.47, region: 'Middle East', place: 'Gaza' },
  { keys: ['west bank', 'ramallah'], lat: 31.9, lon: 35.2, region: 'Middle East', place: 'West Bank' },
  { keys: ['israel', 'israeli', 'idf'], lat: 31.78, lon: 35.22, region: 'Middle East', place: 'Israel' },
  { keys: ['beirut', 'lebanon', 'lebanese', 'hezbollah'], lat: 33.89, lon: 35.5, region: 'Middle East', place: 'Lebanon' },
  { keys: ['damascus', 'syria', 'syrian'], lat: 33.51, lon: 36.29, region: 'Middle East', place: 'Syria' },
  { keys: ['hodeidah', 'hudaydah', 'aden'], lat: 14.8, lon: 42.95, region: 'Red Sea / Bab el-Mandeb', place: 'Yemen coast' },
  { keys: ['sanaa', "sana'a", 'yemen', 'houthi', 'houthis'], lat: 15.35, lon: 44.21, region: 'Middle East', place: 'Yemen' },
  { keys: ['baghdad', 'iraq', 'iraqi'], lat: 33.31, lon: 44.37, region: 'Middle East', place: 'Iraq' },
  { keys: ['cairo', 'egypt', 'egyptian'], lat: 30.04, lon: 31.24, region: 'Africa', place: 'Egypt' },
  { keys: ['khartoum', 'sudan', 'sudanese'], lat: 15.5, lon: 32.56, region: 'Africa', place: 'Sudan' },
  { keys: ['sahel'], lat: 15.5, lon: 0.0, region: 'Africa', place: 'Sahel' },
  { keys: ['mali', 'bamako'], lat: 12.64, lon: -8.0, region: 'Africa', place: 'Mali' },
  // "niger" alone — word-boundary so it does NOT match "nigeria"/"nigerian"
  { keys: ['niger', 'niamey'], lat: 13.51, lon: 2.11, region: 'Africa', place: 'Niger' },
  { keys: ['burkina', 'burkina faso', 'ouagadougou'], lat: 12.37, lon: -1.53, region: 'Africa', place: 'Burkina Faso' },
  { keys: ['nigeria', 'nigerian', 'lagos', 'abuja'], lat: 9.08, lon: 8.68, region: 'Africa', place: 'Nigeria' },
  { keys: ['malawi'], lat: -13.25, lon: 34.3, region: 'Africa', place: 'Malawi' },
  { keys: ['equatorial guinea', 'malabo'], lat: 1.65, lon: 10.27, region: 'Africa', place: 'Equatorial Guinea' },
  { keys: ['gulf of guinea'], lat: 6.4, lon: 3.4, region: 'Africa', place: 'Gulf of Guinea' },
  { keys: ['nepal', 'nepalese', 'nepali', 'kathmandu'], lat: 27.72, lon: 85.32, region: 'South Asia', place: 'Nepal' },
  { keys: ['greece', 'greek', 'athens'], lat: 37.98, lon: 23.73, region: 'Europe', place: 'Greece' },
  { keys: ['haiti', 'port-au-prince', 'haitian'], lat: 18.59, lon: -72.31, region: 'Americas', place: 'Haiti' },
  { keys: ['bolivia', 'bolivian', 'la paz'], lat: -16.5, lon: -68.15, region: 'Americas', place: 'Bolivia' },
  { keys: ['brazil', 'brasilia', 'brazilian', 'lula'], lat: -15.79, lon: -47.88, region: 'Americas', place: 'Brazil' },
  { keys: ['islamabad', 'pakistan', 'pakistani'], lat: 33.68, lon: 73.05, region: 'South Asia', place: 'Pakistan' },
  { keys: ['new delhi', 'delhi', 'india', 'indian'], lat: 28.61, lon: 77.21, region: 'South Asia', place: 'India' },
  { keys: ['pyongyang', 'north korea', 'dprk'], lat: 39.04, lon: 125.76, region: 'East / SE Asia', place: 'North Korea' },
  { keys: ['seoul', 'south korea', 'korean peninsula'], lat: 37.57, lon: 126.98, region: 'East / SE Asia', place: 'South Korea' },
  { keys: ['tokyo', 'japan', 'japanese'], lat: 35.68, lon: 139.69, region: 'East / SE Asia', place: 'Japan' },
  { keys: ['manila', 'philippines', 'philippine'], lat: 14.6, lon: 120.98, region: 'East / SE Asia', place: 'Philippines' },
  { keys: ['strasbourg'], lat: 48.57, lon: 7.75, region: 'Europe', place: 'Strasbourg' },
  { keys: ['london', 'united kingdom', 'britain', 'british', 'uk '], lat: 51.51, lon: -0.13, region: 'Europe', place: 'London' },
  { keys: ['paris', 'france', 'french'], lat: 48.86, lon: 2.35, region: 'Europe', place: 'Paris' },
  { keys: ['berlin', 'germany', 'german', 'bundeswehr'], lat: 52.52, lon: 13.4, region: 'Europe', place: 'Berlin' },
  { keys: ['warsaw', 'poland', 'polish'], lat: 52.23, lon: 21.01, region: 'Europe', place: 'Warsaw' },
  { keys: ['ukraine', 'ukrainian'], lat: 49.0, lon: 32.0, region: 'Eastern Europe', place: 'Ukraine' },
  { keys: ['russia', 'russian', 'kremlin'], lat: 55.76, lon: 37.62, region: 'Europe', place: 'Russia' },
  // v0.4 gazetteer expansion (2026-09-27): countries/cities seen in RSS + X feeds
  { keys: ['new york', 'new jersey', 'northeast us', 'northeastern united states', 'nor\'easter'], lat: 40.71, lon: -74.0, region: 'Americas', place: 'US Northeast' },
  { keys: ['baja california', 'la paz, mexico', 'cabo san lucas'], lat: 24.14, lon: -110.31, region: 'Americas', place: 'Baja California' },
  { keys: ['mexico city'], lat: 19.43, lon: -99.13, region: 'Americas', place: 'Mexico City' },
  { keys: ['mexico', 'mexican'], lat: 23.63, lon: -102.55, region: 'Americas', place: 'Mexico' },
  { keys: ['caracas', 'venezuela', 'venezuelan'], lat: 10.48, lon: -66.9, region: 'Americas', place: 'Venezuela' },
  { keys: ['bogota', 'colombia', 'colombian'], lat: 4.71, lon: -74.07, region: 'Americas', place: 'Colombia' },
  { keys: ['quito', 'ecuador', 'ecuadorian'], lat: -0.18, lon: -78.47, region: 'Americas', place: 'Ecuador' },
  { keys: ['lima', 'peru', 'peruvian'], lat: -12.05, lon: -77.04, region: 'Americas', place: 'Peru' },
  { keys: ['santiago', 'chile', 'chilean'], lat: -33.45, lon: -70.67, region: 'Americas', place: 'Chile' },
  { keys: ['buenos aires', 'argentina', 'argentine'], lat: -34.6, lon: -58.38, region: 'Americas', place: 'Argentina' },
  { keys: ['havana', 'cuba', 'cuban'], lat: 23.11, lon: -82.37, region: 'Americas', place: 'Cuba' },
  { keys: ['saint vincent', 'grenadines'], lat: 13.16, lon: -61.22, region: 'Americas', place: 'St Vincent & Grenadines' },
  { keys: ['jamaica', 'kingston'], lat: 18.0, lon: -76.79, region: 'Americas', place: 'Jamaica' },
  { keys: ['honduras', 'guatemala', 'el salvador'], lat: 14.63, lon: -90.51, region: 'Americas', place: 'Central America' },
  { keys: ['panama'], lat: 8.98, lon: -79.52, region: 'Americas', place: 'Panama' },
  { keys: ['montreal', 'quebec'], lat: 45.5, lon: -73.57, region: 'Americas', place: 'Montreal' },
  { keys: ['ottawa', 'canada', 'canadian'], lat: 45.42, lon: -75.7, region: 'Americas', place: 'Canada' },
  { keys: ['tennessee', 'nashville'], lat: 36.16, lon: -86.78, region: 'Americas', place: 'Tennessee' },
  { keys: ['utah'], lat: 40.76, lon: -111.89, region: 'Americas', place: 'Utah' },
  { keys: ['nevada'], lat: 38.8, lon: -116.42, region: 'Americas', place: 'Nevada' },
  { keys: ['california', 'los angeles', 'san francisco'], lat: 34.05, lon: -118.24, region: 'Americas', place: 'California' },
  { keys: ['texas', 'houston', 'dallas'], lat: 30.27, lon: -97.74, region: 'Americas', place: 'Texas' },
  { keys: ['florida', 'miami'], lat: 25.76, lon: -80.19, region: 'Americas', place: 'Florida' },
  { keys: ['puerto rico'], lat: 18.47, lon: -66.11, region: 'Americas', place: 'Puerto Rico' },
  { keys: ['north kivu', 'goma'], lat: -1.68, lon: 29.22, region: 'Africa', place: 'North Kivu' },
  { keys: ['ituri', 'bunia'], lat: 1.56, lon: 30.25, region: 'Africa', place: 'Ituri' },
  { keys: ['kinshasa', 'congo', 'drc'], lat: -4.32, lon: 15.31, region: 'Africa', place: 'DR Congo' },
  { keys: ['addis ababa', 'ethiopia', 'ethiopian', 'tigray', 'amhara'], lat: 9.03, lon: 38.74, region: 'Africa', place: 'Ethiopia' },
  { keys: ['eritrea', 'asmara'], lat: 15.32, lon: 38.93, region: 'Africa', place: 'Eritrea' },
  { keys: ['mogadishu', 'somalia', 'somali', 'al-shabaab', 'al shabaab'], lat: 2.05, lon: 45.32, region: 'Africa', place: 'Somalia' },
  { keys: ['nairobi', 'kenya', 'kenyan'], lat: -1.29, lon: 36.82, region: 'Africa', place: 'Kenya' },
  { keys: ['south sudan', 'juba'], lat: 4.85, lon: 31.58, region: 'Africa', place: 'South Sudan' },
  { keys: ['darfur', 'el fasher'], lat: 13.63, lon: 25.35, region: 'Africa', place: 'Darfur' },
  { keys: ['tripoli', 'libya', 'libyan', 'benghazi'], lat: 32.89, lon: 13.19, region: 'Africa', place: 'Libya' },
  { keys: ['tunis', 'tunisia', 'tunisian'], lat: 36.81, lon: 10.18, region: 'Africa', place: 'Tunisia' },
  { keys: ['algiers', 'algeria', 'algerian'], lat: 36.75, lon: 3.06, region: 'Africa', place: 'Algeria' },
  { keys: ['rabat', 'morocco', 'moroccan'], lat: 34.02, lon: -6.84, region: 'Africa', place: 'Morocco' },
  { keys: ['johannesburg', 'cape town', 'south africa', 'south african', 'pretoria'], lat: -26.2, lon: 28.05, region: 'Africa', place: 'South Africa' },
  { keys: ['mozambique', 'cabo delgado', 'maputo'], lat: -12.97, lon: 40.52, region: 'Africa', place: 'Mozambique' },
  { keys: ['chad', 'n\'djamena'], lat: 12.13, lon: 15.06, region: 'Africa', place: 'Chad' },
  { keys: ['cameroon', 'yaounde'], lat: 3.85, lon: 11.5, region: 'Africa', place: 'Cameroon' },
  { keys: ['central african republic', 'bangui'], lat: 4.39, lon: 18.56, region: 'Africa', place: 'CAR' },
  { keys: ['uganda', 'kampala'], lat: 0.35, lon: 32.58, region: 'Africa', place: 'Uganda' },
  { keys: ['rwanda', 'kigali'], lat: -1.95, lon: 30.06, region: 'Africa', place: 'Rwanda' },
  { keys: ['zimbabwe', 'harare'], lat: -17.83, lon: 31.05, region: 'Africa', place: 'Zimbabwe' },
  { keys: ['senegal', 'dakar'], lat: 14.72, lon: -17.47, region: 'Africa', place: 'Senegal' },
  { keys: ['ghana', 'accra'], lat: 5.6, lon: -0.19, region: 'Africa', place: 'Ghana' },
  { keys: ['madagascar', 'antananarivo'], lat: -18.88, lon: 47.51, region: 'Africa', place: 'Madagascar' },
  { keys: ['bangkok', 'thailand', 'thai'], lat: 13.76, lon: 100.5, region: 'East / SE Asia', place: 'Thailand' },
  { keys: ['myanmar', 'burma', 'yangon', 'naypyidaw', 'rakhine'], lat: 19.76, lon: 96.08, region: 'East / SE Asia', place: 'Myanmar' },
  { keys: ['hanoi', 'vietnam', 'vietnamese'], lat: 21.03, lon: 105.85, region: 'East / SE Asia', place: 'Vietnam' },
  { keys: ['jakarta', 'indonesia', 'indonesian', 'papua'], lat: -6.21, lon: 106.85, region: 'East / SE Asia', place: 'Indonesia' },
  { keys: ['kuala lumpur', 'malaysia'], lat: 3.14, lon: 101.69, region: 'East / SE Asia', place: 'Malaysia' },
  { keys: ['singapore'], lat: 1.35, lon: 103.82, region: 'East / SE Asia', place: 'Singapore' },
  { keys: ['cambodia', 'phnom penh'], lat: 11.56, lon: 104.92, region: 'East / SE Asia', place: 'Cambodia' },
  { keys: ['hong kong'], lat: 22.32, lon: 114.17, region: 'East / SE Asia', place: 'Hong Kong' },
  { keys: ['shanghai'], lat: 31.23, lon: 121.47, region: 'East / SE Asia', place: 'Shanghai' },
  { keys: ['china', 'chinese', 'pla '], lat: 39.9, lon: 116.4, region: 'East / SE Asia', place: 'China' },
  { keys: ['papua new guinea'], lat: -6.31, lon: 143.96, region: 'East / SE Asia', place: 'Papua New Guinea' },
  { keys: ['solomon islands'], lat: -9.43, lon: 159.95, region: 'East / SE Asia', place: 'Solomon Islands' },
  { keys: ['vanuatu'], lat: -17.73, lon: 168.32, region: 'East / SE Asia', place: 'Vanuatu' },
  { keys: ['new caledonia'], lat: -22.27, lon: 166.46, region: 'East / SE Asia', place: 'New Caledonia' },
  { keys: ['fiji'], lat: -18.14, lon: 178.44, region: 'East / SE Asia', place: 'Fiji' },
  { keys: ['australia', 'australian', 'sydney', 'canberra'], lat: -35.28, lon: 149.13, region: 'East / SE Asia', place: 'Australia' },
  { keys: ['new zealand'], lat: -41.29, lon: 174.78, region: 'East / SE Asia', place: 'New Zealand' },
  { keys: ['kabul', 'afghanistan', 'afghan', 'taliban'], lat: 34.56, lon: 69.21, region: 'South Asia', place: 'Afghanistan' },
  { keys: ['kashmir', 'srinagar'], lat: 34.08, lon: 74.8, region: 'South Asia', place: 'Kashmir' },
  { keys: ['dhaka', 'bangladesh'], lat: 23.81, lon: 90.41, region: 'South Asia', place: 'Bangladesh' },
  { keys: ['sri lanka', 'colombo'], lat: 6.93, lon: 79.86, region: 'South Asia', place: 'Sri Lanka' },
  { keys: ['balochistan', 'quetta'], lat: 30.18, lon: 66.99, region: 'South Asia', place: 'Balochistan' },
  { keys: ['manipur', 'imphal'], lat: 24.82, lon: 93.94, region: 'South Asia', place: 'Manipur' },
  { keys: ['kazakhstan', 'astana'], lat: 51.17, lon: 71.45, region: 'Eastern Europe', place: 'Kazakhstan' },
  { keys: ['belarus', 'minsk', 'lukashenko'], lat: 53.9, lon: 27.57, region: 'Eastern Europe', place: 'Belarus' },
  { keys: ['moldova', 'chisinau', 'transnistria'], lat: 47.01, lon: 28.86, region: 'Eastern Europe', place: 'Moldova' },
  { keys: ['georgia tbilisi', 'tbilisi'], lat: 41.72, lon: 44.79, region: 'Eastern Europe', place: 'Georgia' },
  { keys: ['armenia', 'yerevan'], lat: 40.18, lon: 44.51, region: 'Eastern Europe', place: 'Armenia' },
  { keys: ['azerbaijan', 'baku'], lat: 40.41, lon: 49.87, region: 'Eastern Europe', place: 'Azerbaijan' },
  { keys: ['lithuania', 'vilnius'], lat: 54.69, lon: 25.28, region: 'Eastern Europe', place: 'Lithuania' },
  { keys: ['latvia', 'riga'], lat: 56.95, lon: 24.11, region: 'Eastern Europe', place: 'Latvia' },
  { keys: ['estonia', 'tallinn'], lat: 59.44, lon: 24.75, region: 'Eastern Europe', place: 'Estonia' },
  { keys: ['finland', 'helsinki'], lat: 60.17, lon: 24.94, region: 'Europe', place: 'Finland' },
  { keys: ['romania', 'bucharest'], lat: 44.43, lon: 26.1, region: 'Eastern Europe', place: 'Romania' },
  { keys: ['serbia', 'belgrade', 'kosovo'], lat: 44.79, lon: 20.45, region: 'Europe', place: 'Balkans' },
  { keys: ['northern ireland', 'belfast'], lat: 54.6, lon: -5.93, region: 'Europe', place: 'Northern Ireland' },
  { keys: ['turkey', 'turkish', 'ankara', 'istanbul'], lat: 39.93, lon: 32.86, region: 'Middle East', place: 'Turkey' },
  { keys: ['jordan', 'amman'], lat: 31.95, lon: 35.93, region: 'Middle East', place: 'Jordan' },
  { keys: ['negev', 'beersheba'], lat: 31.25, lon: 34.79, region: 'Middle East', place: 'Negev' },
  { keys: ['kuwait'], lat: 29.38, lon: 47.99, region: 'Persian Gulf', place: 'Kuwait' },
  { keys: ['bahrain', 'manama'], lat: 26.23, lon: 50.59, region: 'Persian Gulf', place: 'Bahrain' },
  { keys: ['abu dhabi', 'dubai', 'uae', 'emirates'], lat: 24.45, lon: 54.38, region: 'Persian Gulf', place: 'UAE' },
  { keys: ['oman', 'muscat'], lat: 23.59, lon: 58.41, region: 'Persian Gulf', place: 'Oman' },
];

/** Region labels only — NEVER used as map pin coords (no Global [20,0] jitter). */
const REGION_FALLBACK = {
  Global: { lat: null, lon: null, region: 'Global' },
  'Middle East': { lat: null, lon: null, region: 'Middle East' },
  Europe: { lat: null, lon: null, region: 'Europe' },
  'Eastern Europe': { lat: null, lon: null, region: 'Eastern Europe' },
  Americas: { lat: null, lon: null, region: 'Americas' },
  Africa: { lat: null, lon: null, region: 'Africa' },
  'East / SE Asia': { lat: null, lon: null, region: 'East / SE Asia' },
  'South Asia': { lat: null, lon: null, region: 'South Asia' },
  'Red Sea / Bab el-Mandeb': { lat: null, lon: null, region: 'Red Sea / Bab el-Mandeb' },
  'Persian Gulf': { lat: null, lon: null, region: 'Persian Gulf' },
};

/** Verbs / context that mark an impact location nearby in text. */
const IMPACT_CONTEXT =
  /\b(attack|attacks|attacked|strike|strikes|struck|missile|missiles|drone|drones|bomb|bombs|bombed|bombing|intercept|intercepted|interception|hit|hits|hitting|targeted|targeting|target|explosion|explode|exploded|invasion|invade|invaded|shelling|shelled|killed|killing|deaths?|fire|fires|burning|over|near|above|in|at|from|towards|toward|against|raid|raids|raided|assault|assaulted|bombard|ballistic|rocket|rockets|artillery|airstrike|airstrikes|warhead|clash|clashes|offensive|defensive|flood|floods|flooding|earthquake|quake|tsunami|wildfire|cyclone|hurricane|typhoon|sinking|hijack|hijacked|piracy|blockade|mine|mined|ied)\b/i;

const SECURITY_SIGNAL =
  /\b(war|warfare|conflict|combat|military|army|navy|air\s*force|troops?|soldier|forces?|militia|insurgent|rebel|coup|junta|nato|pentagon|missile|drone|bomb|airstrike|shelling|artillery|invasion|occupy|occupied|occupation|attack|terror|terrorism|isis|islamic\s*state|al-?qaeda|houthis?|hezbollah|hamas|idf|irgc|nuclear|sanctions?|embargo|blockade|chokepoint|hormuz|bab\s*el-?mandeb|piracy|hijack|maritime|warship|destroyer|frigate|carrier|submarine|cyber\s*(attack|war|espionage|ops)?|ransomware|nation[- ]state|espionage|sabotage|assassination|hostage|kidnap|killed|killing|murder|ied|vbiied|car\s*bomb|suicide\s*bomb|mass\s*casualty|genocide|ethnic\s*cleansing|refugee\s*crisis|humanitarian\s*crisis|famine|earthquake|flood|floods|flooding|tsunami|wildfire|cyclone|hurricane|typhoon|volcano|outbreak|pandemic|chemical\s*weapon|biological\s*weapon|wmd|ballistic|hypersonic|airspace|no[- ]fly|ceasefire|armistice|peacekeeping|un\s*security|security\s*council|gulf\s*security|defense|defence|deterrence|mobilization|mobilisation|conscription|martial\s*law|curfew|riot|uprising|insurrection|separatist|annex|annexation|frontline|front\s*line|trench|drone\s*swarm|air\s*defense|air\s*defence|intercept|radar|satellite\s*weapon|space\s*weapon|on[- ]orbit|extradit|trial|islamic\s*state)\b/i;

const NON_SECURITY =
  /\b(sunlounger|sunbed|beach\s*fight|parakeet|converse|advert|advertisement|sneaker|fashion|golf|pga|nfl|nba|mlb|nhl|premier\s*league|champions\s*league|super\s*bowl|touchdown|running\s*back|quarterback|wide\s*receiver|bucs|browns|falcons|49ers|workout|sport|sports|football|soccer|basketball|baseball|tennis|olympics?|celebrity|red\s*carpet|hollywood|podcast\s*post|cat\s*species|feline|house\s*fire|firefighter|married|wedding|head\s*teacher|abuser|justice|netflix|hollywood|streaming|box\s*office|album|concert|festival\s*ticket|recipe|restaurant|travel\s*guide|holiday|vacation|lifestyle)\b/i;

/**
 * Kinetic / physical impact / named-area military activity required for map pins.
 * Deliberately narrower than SECURITY_SIGNAL (no bare nato/military/sanctions/talks).
 */
const MAP_IMPACT =
  /\b(attack|attacks|attacked|strike|strikes|struck|missile|missiles|drone|drones|bomb|bombs|bombed|bombing|ied|vbiied|car\s*bomb|shelling|shelled|artillery|airstrike|airstrikes|rocket|rockets|ballistic|invasion|invade|invaded|combat|clash|clashes|skirmish|offensive|raid|raids|raided|assault|intercept|intercepted|interception|explosion|explode|exploded|blast|blasts|killed|killing|wounded|casualt(?:y|ies)|shootout|shot\s*dead|gunfire|firefight|mortar|pirate|piracy|boarding|hijack|hijacked|collision|collided|sinking|sunk|mine|mined|blockade|drone\s*swarm|live[- ]?fire|drill|drills|military\s*exercise|war\s*game|war\s*games|earthquake|quake|tsunami|flood|floods|flooding|wildfire|cyclone|hurricane|typhoon|volcano|kidnap|kidnapped|hostage|assassination|assassinated|ransomware|cyber\s*intrusion|scada|war\s+on\s+iran|war\s+with\s+iran|war\s+on\s+israel)\b/i;

/** Maritime incident language — required to pin water/chokepoint centroids. */
const MARITIME_INCIDENT =
  /\b(attack|attacks|attacked|boarding|collision|collided|missile|missiles|drone|drones|swarm|hijack|hijacked|piracy|pirate|struck|strike|strikes|explosion|explode|exploded|sinking|sunk|intercept|intercepted|shelling|bomb|bombed|ied|raid)\b/i;

/** Diplomacy / elections / welfare / legal process / fundraising — never map-pin. */
const MAP_EXCLUDE =
  /\b(election|elections|electoral|welfare|weight[- ]?loss|membership|pardons?|pardoned|plans?\s+to\s+build|stronger\s+ties|bilateral\s+talks?|revive\s+[\w\s-]{0,40}talks?|talks?\s+with|working\s+to\s+revive|diplomatic\s+spat|visa\s+bans?|all\s+smiles|associate\s+member|security\s+framework|framework\s+with|UNSC\s+session|ceasefire\s+draft|designation\s+list|secondary\s+sanctions|welcomes?\s+.{0,40}deal|permanent\s+security\s+control|extradit(?:ed|ion|ing|es)?|opens?\s+trial|trial\s+of|arrested\s+in\s+connection|raises?\s+thousands|fundrais(?:e|ing|er)?|how\s+will\b|ahead\s+of\s+election|state\s+election|vows?\s+to\s+stay|announce[sd]?\s+higher\s+welfare|anti-?austerity\s+protest|protest\s+escalation|tear\s*gas|capital\s+square|port\s+strike|labour\s+strike|labor\s+strike|describes?\s+fallout|fallout\s+of\s+.{0,80}as\s+[\u2018\u2019'"']?earthquake|as\s+[\u2018\u2019'"']earthquake[\u2018\u2019'"']?|investment\s+strategy)\b/i;

/** Water-basin / chokepoint place labels — pin only when title is a real incident. */
const WATER_BASIN_PLACES = new Set([
  'Red Sea',
  'Black Sea',
  'South China Sea',
  'Bab el-Mandeb',
  'Strait of Hormuz',
  'Gulf of Guinea',
]);

/**
 * Coastal landfall / chokepoint shore for maritime basins (never mid-ocean centroids).
 * Applied whenever a water-basin place is resolved so pins sit on/near land.
 */
const MARITIME_LANDFALL = {
  'Black Sea': { lat: 44.6, lon: 33.5, region: 'Eastern Europe', place: 'Black Sea' },
  'South China Sea': { lat: 16.5, lon: 112.5, region: 'East / SE Asia', place: 'South China Sea' },
  'Gulf of Guinea': { lat: 6.4, lon: 3.4, region: 'Africa', place: 'Gulf of Guinea' },
  'Red Sea': { lat: 12.6, lon: 43.3, region: 'Red Sea / Bab el-Mandeb', place: 'Red Sea' },
  'Bab el-Mandeb': { lat: 12.58, lon: 43.33, region: 'Red Sea / Bab el-Mandeb', place: 'Bab el-Mandeb' },
  'Strait of Hormuz': { lat: 27.18, lon: 56.28, region: 'Persian Gulf', place: 'Strait of Hormuz' },
};


function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary-ish includes (avoids niger⊂nigerian, iran⊂iranian handled via explicit keys). */
function keyIndex(hay, key) {
  const k = String(key).toLowerCase();
  if (!k) return -1;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(k)}(?=[^a-z0-9]|$)`, 'i');
  const m = re.exec(hay);
  return m ? m.index + (m[0].length > k.length ? m[0].length - k.length : 0) : -1;
}

/**
 * All place hits in text with character index (first key match per place entry).
 * @param {string} text
 * @returns {Array<PlaceHit & { index: number, key: string }>}
 */
export function findPlaceHits(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return [];
  /** @type {Array<PlaceHit & { index: number, key: string }>} */
  const hits = [];
  for (const p of PLACES) {
    let best = -1;
    let bestKey = '';
    for (const key of p.keys) {
      const idx = keyIndex(hay, key);
      if (idx >= 0 && (best < 0 || idx < best)) {
        best = idx;
        bestKey = key;
      }
    }
    if (best >= 0) {
      hits.push({ lat: p.lat, lon: p.lon, region: p.region, place: p.place, index: best, key: bestKey });
    }
  }
  hits.sort((a, b) => a.index - b.index || b.key.length - a.key.length);
  return hits;
}

/**
 * Scan text for best place: prefer impact-context proximity, else first keyword.
 * @param {string} text
 * @returns {(PlaceHit & { impact: boolean }) | null}
 */
export function geocodeFromText(text) {
  const hay = String(text || '');
  const hits = findPlaceHits(hay);
  if (!hits.length) return null;

  const lower = hay.toLowerCase();

  // Prep + place: "attack on Moscow", "fire in Louisiana", "over Kyiv"
  const prepRe = /\b(?:on|in|at|over|near|above|towards|toward|against|into|from)\s+/gi;
  const prepEnds = [];
  let pm;
  while ((pm = prepRe.exec(lower)) !== null) {
    prepEnds.push(pm.index + pm[0].length);
  }

  const impactRe = new RegExp(IMPACT_CONTEXT.source, 'gi');
  const impactIdxs = [];
  let m;
  while ((m = impactRe.exec(lower)) !== null) {
    impactIdxs.push({ index: m.index, len: m[0].length, word: m[0].toLowerCase() });
  }

  function scoreHit(hit) {
    let score = 0;
    let impact = false;
    // Strong: place starts within 0..24 chars after a location prep
    for (const pe of prepEnds) {
      const gap = hit.index - pe;
      if (gap >= 0 && gap <= 24) {
        score += 100 - gap;
        impact = true;
      }
    }
    // Strong: place shortly AFTER attack/strike/hit/targeted/bomb/explosion/killed
    for (const ii of impactIdxs) {
      const after = hit.index - (ii.index + ii.len);
      const dist = Math.abs(hit.index - ii.index);
      if (after >= 0 && after <= 48) {
        score += 80 - after;
        impact = true;
      } else if (dist <= 56) {
        score += 40 - dist / 2;
        impact = true;
      }
    }
    // Slight preference for earlier mentions when scores tie
    score += Math.max(0, 10 - hit.index / 20);
    // Longer key = more specific
    score += Math.min(hit.key.length, 20) / 10;
    return { score, impact };
  }

  let best = null;
  for (const hit of hits) {
    const { score, impact } = scoreHit(hit);
    if (!best || score > best.score) {
      best = { hit, score, impact };
    }
  }
  const h = best.hit;
  return {
    lat: h.lat,
    lon: h.lon,
    region: h.region,
    place: h.place,
    impact: best.impact || best.score >= 40,
  };
}

/**
 * Lifestyle / sports / entertainment — never map-pin.
 * @param {string} text
 */
export function isNonSecurityNoise(text) {
  return NON_SECURITY.test(String(text || ''));
}

/**
 * Diplomacy / elections / welfare / pure talks — never map-pin.
 * @param {string} text
 */
export function isMapExcluded(text) {
  return MAP_EXCLUDE.test(String(text || ''));
}

/**
 * Kinetic / disaster / drill impact language for map pins.
 * @param {string} text
 */
export function hasMapImpactLanguage(text) {
  return MAP_IMPACT.test(String(text || ''));
}

/**
 * Generic UKMTO/JMIC/VRA PDF or transit advisory without an incident in the title.
 * @param {string} title
 * @param {string} [summary]
 */
export function isGenericMaritimeAdvisory(title, summary = '') {
  const t = String(title || '');
  const hay = `${t} ${summary || ''}`;
  const looks =
    /\b(UKMTO|JMIC|VRA\s*Overview|ADVISORY\s*NOTE|Warning\s+\d{1,4}\/\d{2}|transit\s+advisory)\b/i.test(
      hay,
    ) || /\bPDF\b/i.test(t);
  if (!looks) return false;
  // Title must name a real maritime incident to stay on the map.
  if (MARITIME_INCIDENT.test(t)) return false;
  return true;
}

/**
 * Mid-ocean / basin centroid pins (Red Sea, North Sea seed, named water basins).
 * @param {unknown} lat
 * @param {unknown} lon
 * @param {string|null|undefined} place
 */
export function isWaterOrMidOceanPin(lat, lon, place) {
  if (place && WATER_BASIN_PLACES.has(String(place))) return true;
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  // Seed North Sea centroid
  if (Math.abs(la - 56.5) < 0.75 && Math.abs(lo - 3.5) < 0.75) return true;
  // Legacy mid-basin centroids (pre-landfall remap)
  if (Math.abs(la - 20) < 0.75 && Math.abs(lo - 38.5) < 0.75) return true; // Red Sea
  if (Math.abs(la - 43.4) < 0.75 && Math.abs(lo - 34.0) < 0.75) return true; // Black Sea
  if (Math.abs(la - 12.0) < 0.75 && Math.abs(lo - 114.0) < 0.75) return true; // South China Sea
  if (Math.abs(la - 4.0) < 0.75 && Math.abs(lo - 5.5) < 0.75) return true; // Gulf of Guinea
  if (Math.abs(la - 26.57) < 0.75 && Math.abs(lo - 56.25) < 0.75) return true; // Hormuz water
  return false;
}

/** Snap a resolved place to coastal landfall when it is a maritime basin label. */
export function applyMaritimeLandfall(hit) {
  if (!hit || !hit.place) return hit;
  const lf = MARITIME_LANDFALL[hit.place];
  if (!lf) return hit;
  return { ...hit, lat: lf.lat, lon: lf.lon, region: lf.region || hit.region, place: lf.place };
}

const VESSEL_OR_MARITIME_CTX =
  /\b(vessel|tanker|ship|ships|commercial\s+vessel|boarding|pirate|piracy|hijack|collision|collided|drone\s+swarm|swarm)\b/i;

/**
 * Conflict / security / disaster / maritime / cyber-nation-state signals.
 * Used for feed tagging — NOT alone sufficient for map pins (see computeMapEligible).
 * @param {string} text
 * @param {string} [layer]
 * @param {string} [falloutRisk]
 */
export function hasSecuritySignal(text, layer, falloutRisk) {
  const hay = String(text || '');
  if (isNonSecurityNoise(hay)) return false;
  if (SECURITY_SIGNAL.test(hay)) return true;
  const lay = String(layer || '').toLowerCase();
  if (['terrorism', 'maritime', 'sanctions', 'cyber'].includes(lay) && !isNonSecurityNoise(hay)) {
    // cyber alone needs nation-state / attack flavour unless fallout elevated
    if (lay === 'cyber') {
      return /\b(nation[- ]state|espionage|ransomware|critical\s*infrastructure|grid|pipeline|military|defense|defence|ministry|government)\b/i.test(
        hay,
      );
    }
    return true;
  }
  const risk = String(falloutRisk || '').toLowerCase();
  if ((risk === 'medium' || risk === 'high' || risk === 'critical') && SECURITY_SIGNAL.test(hay)) return true;
  return false;
}

/**
 * Whether an event with resolved place coords should appear on the SecurityMap.
 * Strict: place/coords + kinetic/impact language; never pure diplomacy / generic PDFs.
 * Layer alone or falloutRisk alone is NOT enough.
 */
export function computeMapEligible(opts = {}) {
  const title = String(opts.title || '');
  const summary = String(opts.summary || '');
  const text = `${title} ${summary} ${opts.curatedSummary || ''}`;
  const place = opts.place != null && opts.place !== '' && opts.place !== 'gdelt' ? opts.place : null;
  const hasPlace = opts.hasPlace === true || place != null;
  const latOk = Number.isFinite(Number(opts.lat));
  const lonOk = Number.isFinite(Number(opts.lon));
  if (!hasPlace || !latOk || !lonOk) return false;
  if (isNonSecurityNoise(text)) return false;
  if (isMapExcluded(text)) return false;
  if (isGenericMaritimeAdvisory(title, summary)) return false;
  // Require kinetic / disaster / drill / cyber-intrusion language (not bare "nato"/"security").
  if (!hasMapImpactLanguage(text)) return false;
  // Water / mid-ocean centroids: title must indicate a real maritime incident.
  if (isWaterOrMidOceanPin(opts.lat, opts.lon, place)) {
    if (!MARITIME_INCIDENT.test(title)) return false;
  }
  // Drop pure sanctions layer unless kinetic verbs present (prefer drop designation lists).
  const lay = String(opts.layer || '').toLowerCase();
  if (lay === 'sanctions' && !/\b(attack|strike|missile|drone|bomb|shelling|invasion|boarding|collision|ied|artillery|airstrike)\b/i.test(text)) {
    return false;
  }
  return true;
}

/**
 * Prefer title impact hits, then title any place, then summary impact, then summary place.
 * Never uses feed region "Global" / account regionHint as map coords.
 * @param {{ title?: string, summary?: string, region?: string, layer?: string, falloutRisk?: string, curatedSummary?: string, jitterIndex?: number, jitterSalt?: string, regionHint?: string }} opts
 * @returns {GeoResolve}
 */
export function resolveEventGeo(opts = {}) {
  // Explicitly ignore regionHint / feed Global for coordinates
  const title = opts.title || '';
  const summary = opts.summary || '';

  let titleHit = geocodeFromText(title);
  let summaryHit = geocodeFromText(summary);

  // Vessel / boarding / swarm titles: prefer water-basin / chokepoint from summary
  // over actor-country capitals (e.g. Houthi → Sanaa vs tanker in Red Sea → Bab shore).
  if (
    titleHit &&
    summaryHit &&
    VESSEL_OR_MARITIME_CTX.test(`${title} ${summary}`) &&
    !WATER_BASIN_PLACES.has(titleHit.place) &&
    WATER_BASIN_PLACES.has(summaryHit.place)
  ) {
    titleHit = null;
  }

  if (titleHit) {
    titleHit = applyMaritimeLandfall(titleHit);
    const mapEligible = computeMapEligible({
      title,
      summary,
      curatedSummary: opts.curatedSummary,
      layer: opts.layer,
      falloutRisk: opts.falloutRisk,
      lat: titleHit.lat,
      lon: titleHit.lon,
      place: titleHit.place,
      hasPlace: true,
    });
    return {
      lat: titleHit.lat,
      lon: titleHit.lon,
      region: titleHit.region,
      place: titleHit.place,
      matchedFrom: titleHit.impact ? 'title-impact' : 'title',
      mapEligible,
    };
  }

  if (summaryHit) {
    summaryHit = applyMaritimeLandfall(summaryHit);
    const mapEligible = computeMapEligible({
      title,
      summary,
      curatedSummary: opts.curatedSummary,
      layer: opts.layer,
      falloutRisk: opts.falloutRisk,
      lat: summaryHit.lat,
      lon: summaryHit.lon,
      place: summaryHit.place,
      hasPlace: true,
    });
    return {
      lat: summaryHit.lat,
      lon: summaryHit.lon,
      region: summaryHit.region,
      place: summaryHit.place,
      matchedFrom: summaryHit.impact ? 'summary-impact' : 'summary',
      mapEligible,
    };
  }

  // No place keyword — do NOT jitter Global [20,0]. Keep region label only.
  const regionLabel =
    opts.region && opts.region !== 'Global'
      ? opts.region
      : REGION_FALLBACK[opts.region]?.region || 'Global';
  return {
    lat: null,
    lon: null,
    region: regionLabel,
    place: null,
    matchedFrom: 'none',
    mapEligible: false,
  };
}

/**
 * Coords that look like the old Global [20,0] ±jitter cluster (not real Sahel with place).
 * Sahel true hits are ~[15.5, 0] but carry place/region Africa from keyword — callers
 * should prefer place-based eligibility over this heuristic alone.
 */
export function looksLikeGlobalJitter(lat, lon, region) {
  // null/undefined coords are "unset", not Global jitter pins
  if (lat == null || lon == null || lat === '' || lon === '') {
    return region === 'Global';
  }
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return region === 'Global';
  }
  // Old RSS jitter envelope around [20,0] (excludes Red Sea lon~38, Nigeria lat~9)
  if (la > 12 && la < 28 && lo > -10 && lo < 10) return true;
  return region === 'Global' && Math.abs(la - 20) < 8 && Math.abs(lo - 0) < 12;
}

/**
 * Re-geocode events on wrong Global jitter when title/summary clearly names a place.
 * @param {Array<object>} events
 */
export function regeocodeWrongGlobal(events) {
  let fixed = 0;
  const out = events.map((e) => {
    if (!looksLikeGlobalJitter(e.lat, e.lon, e.region)) return e;
    const hit = geocodeFromText(e.title || '') || geocodeFromText(e.summary || '');
    if (!hit) {
      // Clear bogus Global jitter coords — not map-eligible
      return { ...e, lat: null, lon: null, region: e.region === 'Global' ? 'Global' : e.region, mapEligible: false };
    }
    fixed++;
    const mapEligible = computeMapEligible({
      ...e,
      lat: hit.lat,
      lon: hit.lon,
      place: hit.place,
      hasPlace: true,
    });
    return { ...e, lat: hit.lat, lon: hit.lon, region: hit.region, mapEligible };
  });
  return { events: out, fixed };
}

/**
 * Re-geocode ALL events: impact-first place from title/summary; never fill Global jitter.
 * Sets mapEligible on every row.
 */
export function regeocodeAllNamed(events) {
  let fixed = 0;
  let cleared = 0;
  let filled = 0;
  const out = events.map((e) => {
    const geo = resolveEventGeo({
      title: e.title,
      summary: e.summary,
      curatedSummary: e.curatedSummary,
      region: e.region,
      layer: e.layer,
      falloutRisk: e.falloutRisk,
    });

    if (geo.place) {
      const same =
        Number(e.lat) === geo.lat &&
        Number(e.lon) === geo.lon &&
        e.region === geo.region &&
        e.mapEligible === geo.mapEligible;
      if (!same) fixed++;
      return {
        ...e,
        lat: geo.lat,
        lon: geo.lon,
        region: geo.region,
        mapEligible: geo.mapEligible,
      };
    }

    // No place keyword in title/summary — never keep Global jitter or stale pins on the map.
    // GDELT rows with real instrumented coords may keep them only when source says so AND
    // coords are finite and outside the Global jitter envelope.
    const src = String(e.source || '');
    const la = e.lat == null ? NaN : Number(e.lat);
    const lo = e.lon == null ? NaN : Number(e.lon);
    const latOk = Number.isFinite(la);
    const lonOk = Number.isFinite(lo);
    const wasJitter = looksLikeGlobalJitter(e.lat, e.lon, e.region);
    const gdeltKeep =
      /^GDELT/i.test(src) &&
      latOk &&
      lonOk &&
      !wasJitter &&
      !(Math.abs(la) < 0.01 && Math.abs(lo) < 0.01);

    if (gdeltKeep) {
      // Instrumented GDELT coords may stay on the row, but map pins need impact language
      // and must not treat mid-ocean centroids as a "place" without a keyword hit.
      const textPlace = geocodeFromText(e.title || '') || geocodeFromText(e.summary || '');
      const kinetic = hasMapImpactLanguage(`${e.title || ''} ${e.summary || ''}`);
      const mapEligible = computeMapEligible({
        ...e,
        hasPlace: Boolean(textPlace?.place) || kinetic,
        place: textPlace?.place || null,
        lat: e.lat,
        lon: e.lon,
      });
      if (e.mapEligible !== mapEligible) fixed++;
      return { ...e, mapEligible };
    }

    if (latOk || lonOk || e.mapEligible !== false) cleared++;
    return {
      ...e,
      lat: null,
      lon: null,
      region: e.region && e.region !== 'Global' ? e.region : geo.region,
      mapEligible: false,
    };
  });
  return { events: out, fixed, filled, cleared };
}

/**
 * Apply map eligibility + clear Global-jitter pins across an events array.
 * Preferred one-shot for events.json refresh (does not wipe non-geo fields).
 */
export function applyMapEligibility(events) {
  const { events: out, fixed, cleared } = regeocodeAllNamed(events);
  return { events: out, fixed, cleared };
}

export { PLACES, REGION_FALLBACK, IMPACT_CONTEXT, SECURITY_SIGNAL, NON_SECURITY, MAP_IMPACT, MAP_EXCLUDE, MARITIME_INCIDENT, WATER_BASIN_PLACES, MARITIME_LANDFALL };
