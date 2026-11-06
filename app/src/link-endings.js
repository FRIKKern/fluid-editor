// The word endings that make a typed word a link (E4, parity/findings/CAP-E4ENDS.json): every name the
// oracle linked, read one by one. Made up and reserved names are left out: comma, toolong, nope, abcd,
// wxyz, test, local, example, invalid, localhost, onion. Inferred: real names we did not read link there too.
export const LINK_ENDINGS = new Set(`
ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo br bs bt bv bw by bz ca
cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er es et eu fi fj fk fm fo fr
ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm
jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq
mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa
re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn
to tr tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw com org net edu gov mil int info
biz name pro aero asia cat coop jobs mobi museum post tel travel xxx arpa academy accountant accountants actor
adult agency airforce apartments app army art associates attorney auction audio auto band bank bar barcelona
beauty beer berlin best bet bible bid bike bingo bio black blackfriday blog blue boston boutique build
builders business buzz cab cafe cam camera camp capital car cards care careers cars casa cash casino catering
center ceo charity chat cheap christmas church city claims cleaning click clinic clothing cloud club coach
codes coffee college community company computer condos construction consulting contractors cooking cool
country coupons courses credit creditcard cricket cruises dance date dating deals degree delivery democrat
dental dentist design dev diamonds diet digital direct directory discount doctor dog domains download earth
eco education email energy engineer engineering enterprises equipment estate events exchange expert exposed
express fail faith family fans farm fashion film finance financial fish fishing fit fitness flights florist
flowers football forex forsale foundation fun fund furniture futbol fyi gallery game games garden gay gift
gifts gives glass global gmbh gold golf graphics gratis green gripe group guide guitars guru hair haus health
healthcare help hiphop hockey holdings holiday homes horse hospital host hosting house how icu immo immobilien
inc industries ink institute insurance insure international investments irish jetzt jewelry juegos kaufen kim
kitchen kiwi land law lawyer lease legal lgbt life lighting limited limo link live loan loans lol london love
ltd luxury maison management market marketing mba media meme memorial men menu miami mma moda mom money
mortgage movie nagoya network new news nexus ngo ninja now nyc observer one ong onl online ooo organic page
paris partners parts party pet phd photo photography photos physio pics pictures pink pizza place plumbing
plus poker porn press productions promo properties property protection pub qpon quebec racing radio realestate
realty recipes red rehab reise reisen rent rentals repair report republican rest restaurant review reviews
rich rip rocks rodeo rugby run sale salon sarl school schule science security select services sex sexy shiksha
shoes shop shopping show singles site ski skin sky social software solar solutions soy space spa sport storage
store stream studio study style sucks supplies supply support surf surgery sydney systems taxi team tech
technology tennis theater tickets tienda tips tires today tokyo tools top tours town toys trade training tube
university uno vacations vegas ventures vet viajes video villas vin vip vision vodka vote voting voyage watch
webcam website wedding wiki win wine work works world wtf xyz yoga zip zone google amazon apple
`.trim().split(/\s+/));
