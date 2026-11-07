// The word endings that make a typed word a link (E4, parity/findings/CAP-E4ENDS.json): every name the
// oracle linked, read one by one. Made up and reserved names are left out: comma, toolong, nope, abcd,
// wxyz, test, local, example, invalid, localhost, onion. Then the rest of a public list's longer names, typed on the
// oracle: 540 of 587 link (CAP-E4ENDS2.json), all 80 more (CAP-E4ENDS3.json). The 47 that don't, retired or dropped
// names (active, comcast, goo, vista and the rest), are left out. Not read: names in other scripts.
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
aaa aarp abb abbott abbvie abc able abogado abudhabi accenture aco ads aeg aetna afl africa agakhan aig airbus airtel
akdn alibaba alipay allfinanz allstate ally alsace alstom americanexpress americanfamily amex amfam amica amsterdam
analytics android anquan anz aol aquarelle arab aramco archi arte asda athleta audi audible auspost author autos aws
axa azure baby baidu banamex barclaycard barclays barefoot bargains baseball basketball bauhaus bayern bbc bbt bbva
bcg bcn beats bestbuy bharti bing blockbuster bloomberg bms bmw bnpparibas boats boehringer bofa bom bond boo book
booking bosch bostik bot box bradesco bridgestone broadway broker brother brussels buy bzh cal call calvinklein canon
capetown capitalone caravan career case catholic cba cbn cbre cern cfa cfd chanel channel chase chintai chrome
cipriani circle cisco citadel citi citic clinique clubmed cologne commbank compare comsec contact corsica coupon cpa
creditunion crown crs cruise cuisinella cymru cyou dad data datsun day dclk dds deal dealer dell deloitte delta desi
dhl discover dish diy dnp docs dot drive dtv dubai dupont durban dvag dvr eat edeka emerck epson ericsson erni esq
eurovision eus extraspace fage fairwinds fan farmers fast fedex feedback ferrari ferrero fidelity fido final fire
firestone firmdale flickr flir fly foo food ford forum fox free fresenius frl frogans frontier ftr fujitsu gal gallo
gallup gap gbiz gdn gea gent genting george ggee giving gle globo gmail gmo gmx godaddy goldpoint goodyear goog gop
got grainger grocery gucci guge hamburg hangout hbo hdfc hdfcbank helsinki here hermes hisamitsu hitachi hiv hkt
homedepot homegoods homesense honda hot hotels hotmail hsbc hughes hyatt hyundai ibm icbc ice ieee ifm ikano imamat
imdb infiniti ing intuit ipiranga ismaili ist istanbul itau itv jaguar java jcb jeep jio jll jmp jnj joburg jot joy
jpmorgan jprs juniper kddi kerryhotels kerryproperties kfh kia kids kindle koeln komatsu kosher kpmg kpn krd kred
kuokgroup kyoto lacaixa lamborghini lamer landrover lanxess lasalle lat latino latrobe lds leclerc lefrak lego lexus
lidl lifeinsurance lifestyle like lilly lincoln living llc llp locker locus lotte lotto lpl lplfinancial ltda lundbeck
luxe madrid maif makeup man mango map markets marriott marshalls mattel mckinsey med meet melbourne merck merckmsd
microsoft mini mint mit mitsubishi mlb mls mobile moe moi monash monster mormon moscow moto motorcycles mov msd mtn
mtr music nab navy nba nec netbank netflix neustar next nextdirect nfl nhk nico nike nikon nissan nissay nokia norton
nowruz nowtv nra nrw ntt obi office okinawa olayan olayangroup ollo omega open oracle orange origins osaka otsuka ott
ovh panasonic pars pay pccw pfizer pharmacy philips phone pictet pid pin ping pioneer play playstation pnc pohl
politie praxi prime prod prof progressive pru prudential pwc quest read realtor redumbrella reit reliance ren rexroth
richardli ricoh ril rio rogers room rsvp ruhr rwe ryukyu saarland safe safety sakura samsclub samsung sandvik
sandvikcoromant sanofi sap sas save saxo sbi sbs scb schaeffler schmidt scholarships schwarz scot search seat secure
seek sener seven sew sfr shangrila sharp shell shia shouji silk sina skype sling smart smile sncf soccer softbank sohu
song sony spot srl stada staples star statebank statefarm stc stcgroup stockholm suzuki swatch swiss tab taipei talk
taobao target tatamotors tatar tattoo tax tci tdk temasek teva thd theatre tiaa tirol tjmaxx tjx tkmaxx tmall toray
toshiba total toyota trading travelers travelersinsurance trust trv tui tunes tushu tvs ubank ubs unicom uol ups vana
vanguard verisign versicherung vig viking virgin visa viva vivo vlaanderen volvo voto wales walmart walter wang
wanggou watches weather weatherchannel weber wed weibo weir whoswho wien williamhill windows winners wme woodside wow
wtc xbox xerox xihuan xin yachts yahoo yamaxun yandex yodobashi yokohama you youtube yun zappos zara zero zuerich
`.trim().split(/\s+/));
