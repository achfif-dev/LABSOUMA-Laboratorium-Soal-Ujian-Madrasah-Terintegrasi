// Kamus TOPIK ILMU-ILMU KEISLAMAN selain fiqih: akidah, tasawuf, akhlak/adab, ushul fiqih, qawaid, balaghah, nahwu, sharaf, tafsir,
// ulumul Qur'an, tajwid, mustalah hadits, hadits, sirah/tarikh, mantiq, dan istilah mazhab. Format dan aturan sama dengan web/lib/kamusTopikFiqh.js:
//   fan | sebutan Indonesia; sebutan lain | istilah Arab di kitab; istilah lain | kata isi khas
// Menambah istilah: cukup tambah satu baris. Isi hanya NAMA dan KATA KUNCI pencarian, bukan isi ajaran atau jawaban.

export const ILMU_TEKS = `
# ---------- AKIDAH ----------
akidah|sifat dua puluh; sifat wajib bagi allah; sifat wajib allah; 20 sifat allah; sifat dua puluh allah|الصفات العشرون; الصفات الواجبة لله; صفات الله الواجبة|وجود; قدم; بقاء; مخالفة; قيام بالنفس; وحدانية
akidah|wujud; sifat wujud; adanya allah; bukti adanya allah|الوجود; وجود الله; واجب الوجود|نفسية; حدوث; عالم; دليل; مخصص
akidah|qidam; qadim; sifat qidam; sifat qadim; allah bersifat qadim|القدم; قديم; القدم والبقاء|أزلي; حادث; عدم; أول; تسلسل
akidah|baqa; kekal; sifat baqa; allah bersifat kekal|البقاء; الباقي; بقاء الله|فناء; آخر; عدم; استحالة; دوام
akidah|mukhalafah lil hawadits; berbeda dengan makhluk; mukhalafatuhu; allah berbeda dengan makhluk|مخالفة الحوادث; المخالفة للحوادث; مخالفته تعالى للحوادث|مماثلة; جرم; عرض; جهة; تحيز
akidah|qiyamuhu binafsihi; berdiri sendiri; qiyam binafsih; allah tidak butuh|القيام بالنفس; قيامه بنفسه; الغنى المطلق|غني; محل; مخصص; افتقار; استغناء
akidah|wahdaniyah; keesaan allah; tauhid; allah maha esa; esa; ke-esaan allah|الوحدانية; وحدانية; التوحيد; توحيد الله|شريك; تعدد; تركيب; كم; تمانع
akidah|qudrat; iradah; kekuasaan allah; kehendak allah; sifat qudrat; sifat iradah|القدرة; الإرادة; قدرة الله; إرادة الله|تعلق; ممكن; تأثير; تخصيص; ممكنات
akidah|ilmu allah; sifat ilmu; sifat hayat; allah maha mengetahui; allah maha hidup|العلم; الحياة; علم الله; حياة الله|تعلق; انكشاف; معلوم; حي; محيط
akidah|sama'; bashar; kalam; allah maha mendengar; allah maha melihat; allah berfirman; sifat sama; sifat bashar; sifat kalam|السمع; البصر; الكلام; سمع الله; بصر الله|تعلق; موجود; مسموع; مبصر; متكلم
akidah|sifat ma'ani; sifat ma'nawiyah; sifat salbiyah; sifat nafsiyah; pembagian sifat allah|صفات المعاني; الصفات المعنوية; الصفات السلبية; الصفة النفسية|قادر; مريد; عالم; حي; سميع; بصير; متكلم
akidah|sifat mustahil; mustahil bagi allah; lawan sifat wajib; sifat yang mustahil bagi allah|المستحيل; الصفات المستحيلة; المستحيل في حقه تعالى|عدم; حدوث; فناء; مماثلة; عجز
akidah|sifat jaiz; jaiz bagi allah; mumkin; allah berbuat atau meninggalkan|الجائز; الجائز في حقه تعالى; الممكن|فعل; ترك; ممكنات; أن يفعل; كل ممكن
akidah|sifat wajib rasul; sifat rasul; shidiq amanah tabligh fathanah; sifat wajib nabi; empat sifat rasul|صفات الرسل; الواجب في حق الرسل|صدق; أمانة; تبليغ; فطانة; عصمة
akidah|sifat mustahil rasul; lawan sifat rasul; kidzb khianat kitman baladah|المستحيل في حق الرسل|كذب; خيانة; كتمان; بلادة; ضد
akidah|sifat jaiz rasul; sifat basyariyah; rasul makan minum menikah; rasul bersifat manusiawi|الجائز في حق الرسل; الأعراض البشرية|أكل; شرب; نكاح; مرض; بشر
akidah|nabi dan rasul; perbedaan nabi dan rasul; jumlah nabi; 25 rasul; nabi ulul azmi; ulul azmi|النبي والرسول; الأنبياء والرسل; أولو العزم|خمسة وعشرين; شريعة; أمر; نوح; إبراهيم; موسى
akidah|mukjizat; karamah; ma'unah; istidraj; irhas; perbedaan mukjizat dan karamah|المعجزة; الكرامة; المعونة; الاستدراج; الإرهاص|خرق عادة; تحدي; ولي; نبوة; عادة
akidah|malaikat; sepuluh malaikat; tugas malaikat; jibril mikail; nama malaikat; malaikat sepuluh|الملائكة; الملك; الإيمان بالملائكة|جبريل; ميكائيل; إسرافيل; عزرائيل; رقيب; عتيد; منكر; نكير
akidah|kitab suci; kitab-kitab allah; taurat zabur injil; kitab samawi; kitab yang diturunkan|الكتب السماوية; الكتب المنزلة; الإيمان بالكتب|التوراة; الزبور; الإنجيل; صحف; قرآن
akidah|hari akhir; kiamat; hari kiamat; tanda kiamat; sam'iyyat; alam akhirat; hari kebangkitan|اليوم الآخر; القيامة; أشراط الساعة; السمعيات|بعث; حشر; نشر; صور; ساعة
akidah|alam kubur; barzakh; siksa kubur; nikmat kubur; munkar nakir; pertanyaan kubur|عذاب القبر; نعيم القبر; البرزخ; سؤال القبر|منكر; نكير; فتنة; قبر; ملكان
akidah|mizan; timbangan amal; hari hisab; shirath; haudh; syafaat; hari perhitungan|الميزان; الحساب; الصراط; الحوض; الشفاعة|حسنات; سيئات; كتاب; جسر; كوثر
akidah|surga; neraka; jannah; naar; kekal di neraka; pahala; siksa|الجنة; النار; الخلود|خلود; حور; نعيم; عذاب; ثواب
akidah|qadha dan qadar; takdir; kasab; jabr; qadariyah; jabariyah; ikhtiyar; iman kepada takdir|القضاء والقدر; القدر; الكسب; الجبرية; القدرية|اختيار; جبر; خلق; إرادة; لوح محفوظ
akidah|iman; rukun iman; rukun islam; definisi iman; iman bertambah berkurang; pengertian iman; islam dan iman|الإيمان; أركان الإيمان; أركان الإسلام; حقيقة الإيمان|تصديق; إقرار; عمل; زيادة; نقصان
akidah|kufur; syirik; nifaq; kafir; dosa besar; kabair; macam kufur; macam syirik|الكفر; الشرك; النفاق; الكبائر|شرك; ردة; كبيرة; صغيرة; توبة
akidah|ru'yatullah; melihat allah di akhirat; melihat allah; ru'yah|رؤية الله; الرؤية; رؤية المؤمنين|آخرة; جهة; مقابلة; جواز; بصر
akidah|ayat mutasyabihat; istiwa; tangan allah; ta'wil; tafwidh; sifat khabariyah; ayat sifat|المتشابه; الاستواء; التأويل; التفويض; الصفات الخبرية|يد; وجه; عرش; تنزيه; تشبيه
akidah|tawassul; tabarruk; istighatsah; ziarah wali; hukum tawassul|التوسل; التبرك; الاستغاثة|ولي; نبي; جاه; دعاء; زيارة
akidah|asy'ariyah; maturidiyah; mu'tazilah; khawarij; murji'ah; aliran kalam; firqah; ahlussunnah wal jamaah; aswaja|الأشاعرة; الماتريدية; المعتزلة; الخوارج; المرجئة; الفرق; أهل السنة والجماعة|فرقة; أهل السنة; كلام; مذهب; أصول
akidah|kalamullah; al-quran makhluk; kalam nafsi; kalam allah|الكلام النفسي; كلام الله; حدوث القرآن|قديم; لفظ; نفسي; مخلوق; حرف
akidah|dalil aqli; dalil naqli; dalil sam'i; ma'rifat allah; cara mengenal allah; bukti keberadaan allah|الدليل العقلي; الدليل النقلي; معرفة الله; وجوب المعرفة|حدوث; عالم; برهان; استدلال; نظر
akidah|hukum akal; wajib aqli; mustahil aqli; jaiz aqli; tiga hukum akal; hukum aqli|الحكم العقلي; الواجب العقلي; المستحيل العقلي; الجائز العقلي|وجوب; استحالة; جواز; عقل; ضروري
# ---------- TASAWUF ----------
tasawuf|tobat; taubat; syarat taubat; bertaubat; taubat nasuha|التوبة; شروط التوبة; التوبة النصوح|ندم; إقلاع; عزم; استغفار; رد المظالم
tasawuf|ikhlas; ikhlash; niat ikhlas; keikhlasan; ikhlas beramal|الإخلاص; إخلاص; الإخلاص في العمل|نية; رياء; عمل; صدق; خالص
tasawuf|riya; pamer; sum'ah; riya'; beramal karena manusia|الرياء; السمعة; مراءاة الناس|شرك أصغر; مراءاة; إخلاص; خفي; ثناء
tasawuf|ujub; kagum diri; bangga diri; ujub dan takabur|العجب; الإعجاب بالنفس|نفس; كبر; نسيان; فضل; نعمة
tasawuf|sombong; takabbur; kibr; kesombongan; sifat sombong|الكبر; التكبر; الكبرياء|بطر; غمط; عجب; تواضع; احتقار
tasawuf|tawadhu; rendah hati; tawadhu'; kerendahan hati|التواضع; تواضع|خضوع; كبر; لين; خفض; ذل
tasawuf|hasad; dengki; iri hati; ghibthah; hasud|الحسد; حسد; الغبطة|نعمة; زوال; حقد; تمني; محسود
tasawuf|ghibah; menggunjing; namimah; adu domba; buhtan; fitnah; gosip|الغيبة; النميمة; البهتان|ذكر; أخ; بما يكره; إفساد; كذب
tasawuf|sabar; macam sabar; kesabaran; bersabar|الصبر; صبر; أنواع الصبر|بلاء; طاعة; معصية; جزع; شكوى
tasawuf|syukur; bersyukur; nikmat; rasa syukur; hakikat syukur|الشكر; شكر; حقيقة الشكر|نعمة; حمد; لسان; قلب; جوارح
tasawuf|zuhud; wara'; zuhud dunia; meninggalkan dunia; hidup zuhud|الزهد; الورع; زهد الدنيا|دنيا; شبهة; حلال; قناعة; ترك
tasawuf|qana'ah; puas dengan rezeki; qanaah; cukup dengan yang ada|القناعة; قناعة; الرضا بالقسمة|غنى; حرص; طمع; كفاف; رزق
tasawuf|tawakal; tawakkal; berserah diri; bertawakal|التوكل; توكل على الله|اعتماد; أسباب; كفالة; ثقة; اكتساب
tasawuf|ridha; rida; ridha terhadap takdir; ridha kepada allah; rela terhadap takdir|الرضا; الرضا بالقضاء; رضا الله|قضاء; تسليم; سخط; مقام; صبر
tasawuf|khauf; raja'; takut kepada allah; harap kepada allah; khasyyah; rasa takut; rasa harap|الخوف; الرجاء; الخشية|خشية; وعيد; وعد; رحمة; عذاب
tasawuf|mahabbah; cinta kepada allah; cinta ilahi; rindu allah; cinta allah|المحبة; محبة الله; الشوق|حب; ود; قرب; معرفة; عشق
tasawuf|ma'rifat; makrifat; ma'rifatullah; ahli makrifat; arif billah|المعرفة; معرفة الله; العارف|كشف; مشاهدة; ذوق; عرفان; يقين
tasawuf|maqam; maqamat; ahwal; hal; tingkatan salik; tingkatan tasawuf; maqam dan hal|المقامات; الأحوال; المقام والحال|مجاهدة; كسب; وهب; سالك; ترقي
tasawuf|muraqabah; muhasabah; introspeksi; mawas diri; evaluasi diri|المراقبة; المحاسبة; محاسبة النفس|رقيب; نفس; حساب; حضور; عتاب
tasawuf|musyahadah; fana; baqa; kasyf; ittihad; hulul; wahdatul wujud; fana dan baqa|المشاهدة; الفناء والبقاء; الكشف; وحدة الوجود|فناء; حضرة; غيبة; شهود; جمع
tasawuf|tazkiyatun nafs; penyucian jiwa; membersihkan hati; tazkiyah; mensucikan jiwa|تزكية النفس; التزكية; تهذيب النفس|تخلية; تحلية; تطهير; قلب; رياضة
tasawuf|nafsu; jenis nafsu; nafsu ammarah; lawwamah; muthmainnah; hawa nafsu; tingkatan nafsu|النفس; النفس الأمارة; النفس اللوامة; النفس المطمئنة; الهوى|أمارة; لوامة; مطمئنة; ملهمة; راضية
tasawuf|penyakit hati; amrad al-qulub; hati yang sakit; sifat tercela; akhlak tercela; sifat madzmumah|أمراض القلوب; الأخلاق المذمومة; المهلكات|قلب; رياء; حسد; كبر; حقد
tasawuf|sifat terpuji; akhlak mahmudah; munjiyat; sifat baik; akhlak terpuji|الأخلاق المحمودة; المنجيات; الفضائل|صبر; شكر; إخلاص; توبة; تقوى
tasawuf|dzikir; zikir; wirid; hizb; ratib; dzikir setelah shalat; macam dzikir; keutamaan dzikir|الذكر; الأذكار; الورد; الوظيفة|تسبيح; تحميد; تكبير; تهليل; قلب
tasawuf|tarekat; thariqah; mursyid; baiat tarekat; salik; suluk; tarekat sufi; guru mursyid|الطريقة; المرشد; السلوك; السالك|بيعة; سلسلة; مريد; خلوة; رابطة
tasawuf|riyadhah; mujahadah; khalwat; uzlah; lapar; riyadhah nafs; mujahadah nafs|الرياضة; المجاهدة; الخلوة; العزلة|جوع; سهر; صمت; عزلة; قلة الطعام
tasawuf|ihsan; arti ihsan; ihsan dalam ibadah|الإحسان; إحسان|تعبد; كأنك تراه; مراقبة; حضور
tasawuf|shidq; kejujuran; jujur; shidiq; kejujuran dalam niat|الصدق; صدق; الصادقين|كذب; أمانة; وفاء; قول; عزم
tasawuf|wali; wali allah; karamah wali; kewalian; kriteria wali|الولي; الأولياء; الولاية|تقوى; إيمان; قطب; كرامة; اتباع
tasawuf|cinta rasul; mahabbah rasul; shalawat; sholawat; bershalawat; cinta nabi|محبة الرسول; الصلاة على النبي; محبة النبي|صلاة; سلام; حب; اتباع; فضل
tasawuf|kitab ihya; imam ghazali; bidayatul hidayah; nashaihul ibad; hikam; ta'lim muta'allim; kitab tasawuf|إحياء علوم الدين; بداية الهداية; نصائح العباد; الحكم العطائية; تعليم المتعلم|غزالي; ربع; عادات; عبادات; مهلكات; منجيات
# ---------- AKHLAK DAN ADAB ----------
akhlak|adab murid; adab belajar; adab pelajar; adab menuntut ilmu; etika santri; adab santri; adab penuntut ilmu|آداب المتعلم; آداب طالب العلم; أدب المتعلم|علم; معلم; نية; توقير; صبر
akhlak|adab guru; adab mengajar; etika guru; adab muallim; adab pengajar; akhlak guru|آداب المعلم; أدب المعلم; آداب العالم|تعليم; رفق; إخلاص; نصح; تواضع
akhlak|adab terhadap guru; menghormati guru; hormat guru; hak guru; berbakti pada guru|حق المعلم; توقير المعلم; احترام الأستاذ|توقير; أدب; طاعة; خدمة; رضا
akhlak|berbakti orang tua; birrul walidain; durhaka orang tua; uququl walidain; hak orang tua; berbakti kepada ibu bapak|بر الوالدين; عقوق الوالدين; حق الوالدين|والد; أم; أب; طاعة; إحسان
akhlak|silaturahmi; silaturahim; memutus silaturahmi; kerabat; hubungan kekerabatan|صلة الرحم; قطيعة الرحم; الأرحام|رحم; قرابة; قطع; وصل; زيارة
akhlak|adab makan; adab minum; makan dengan tangan kanan; etika makan; adab di meja makan|آداب الأكل; آداب الشرب; الأكل والشرب|بسملة; يمين; حمد; مما يليك; طعام
akhlak|adab tidur; adab bangun tidur; doa tidur; adab sebelum tidur|آداب النوم; النوم; الاضطجاع|يمين; وضوء; دعاء; أذكار; نوم
akhlak|adab masuk masjid; adab ke masjid; adab di masjid; etika masjid|آداب المسجد; دخول المسجد|يمين; دعاء; تحية; خروج; مسجد
akhlak|adab bertamu; adab berkunjung; menjamu tamu; adab tamu; dhuyuf; menghormati tamu|آداب الضيافة; إكرام الضيف; الاستئذان|ثلاثة أيام; ضيف; استئذان; سلام; ضيافة
akhlak|adab salam; memberi salam; menjawab salam; salam; adab bersalaman|السلام; آداب السلام; رد السلام|إفشاء; جواب; تحية; مصافحة; سلام
akhlak|adab bersin; adab menguap; tasymit; bersin; menguap|العطاس; التثاؤب; تشميت العاطس|حمد; يرحمك الله; كظم; عطس; تثاؤب
akhlak|tetangga; hak tetangga; adab bertetangga; berbuat baik kepada tetangga|الجار; حق الجار; حقوق الجار|جوار; أذى; إحسان; هدية; جار
akhlak|amanah; menepati janji; wafa bil ahd; khianat; dusta; bohong; jujur dan amanah|الأمانة; الوفاء بالعهد; الخيانة; الكذب|وعد; عهد; صدق; نفاق; أمانة
akhlak|malu; haya; rasa malu; sifat malu|الحياء; حياء|إيمان; خجل; عفة; حشمة
akhlak|menahan marah; marah; kasih sayang; lemah lembut; hilm; rifq; sifat santun; pemaaf|الحلم; كظم الغيظ; الرفق; الرحمة; الغضب|غضب; عفو; لين; شفقة; رفق
akhlak|dermawan; pelit; bakhil; sakha; kikir; kedermawanan; sifat dermawan; sifat pelit|السخاء; الجود; البخل; الكرم; الشح|إنفاق; بخل; عطاء; إيثار; جود
akhlak|menjaga pandangan; ghadhdhul bashar; pandangan haram; zina mata; memandang lawan jenis|غض البصر; النظر; نظرة|عورة; أجنبية; فتنة; حرام; نظر
akhlak|menjaga lisan; hifzhul lisan; berbicara baik; diam; kata-kata; adab berbicara; bahaya lisan|حفظ اللسان; اللسان; الصمت; آفات اللسان|كلام; غيبة; كذب; صمت; لسان
akhlak|musyawarah; syura; bermusyawarah; adab musyawarah|الشورى; المشاورة; شورى|رأي; نصح; استشارة; مشورة
akhlak|persaudaraan; ukhuwah; hak sesama muslim; persahabatan; ukhuwah islamiyah; memilih teman; teman yang baik|الأخوة; حقوق المسلم; الصحبة; الأخوة في الله|أخ; حق; محبة; تناصر; صاحب
akhlak|berbuat baik kepada hewan; adab terhadap hewan; kasih sayang hewan; menyiksa hewan|الرفق بالحيوان; الرحمة بالبهائم|بهيمة; ذبح; رفق; تعذيب; حيوان
akhlak|kebersihan; nazhafah; menjaga kebersihan; kebersihan sebagian iman|النظافة; الطهارة; نظافة|إيمان; طهور; فطرة; أذى; نظيف
akhlak|berdoa; adab berdoa; doa mustajab; waktu mustajab; syarat doa dikabulkan; etika berdoa|الدعاء; آداب الدعاء; دعاء|إجابة; رفع يدين; ثناء; صلاة على النبي; إلحاح
akhlak|khusyu; khusyuk; kekhusyukan; khusyu dalam shalat|الخشوع; خشوع; الخشوع في الصلاة|حضور القلب; تدبر; سكون; خضوع
akhlak|keutamaan ilmu; fadhilah ilmu; wajib menuntut ilmu; fardhu ain ilmu; fardhu kifayah ilmu; menuntut ilmu; kewajiban belajar|فضل العلم; طلب العلم; وجوب طلب العلم|فرض عين; فرض كفاية; علماء; تعلم; تعليم
# ---------- USHUL FIQIH ----------
ushul|hukum taklifi; wajib; mandub; mubah; makruh; haram; pembagian hukum; lima hukum; hukum syar'i|الحكم التكليفي; الأحكام الخمسة; الواجب; المندوب; المباح; المكروه; الحرام|فرض; سنة; إباحة; كراهة; تحريم
ushul|hukum wadh'i; sebab; syarat; mani'; sah; batal; rukhshah; azimah; shihhah; hukum wadh'i dan taklifi|الحكم الوضعي; السبب; الشرط; المانع; الصحة; البطلان; الرخصة; العزيمة|وضع; سبب; شرط; مانع; عزيمة; رخصة
ushul|wajib muwassa; wajib mudhayyaq; wajib aini; wajib kifa'i; wajib mukhayyar; fardhu kifayah; fardhu ain; macam wajib|الواجب الموسع; الواجب المضيق; فرض الكفاية; فرض العين; الواجب المخير|موسع; مضيق; عيني; كفائي; مخير
ushul|sumber hukum islam; adillah syar'iyyah; dalil hukum; sumber hukum; dalil-dalil syara'; sumber pengambilan hukum|الأدلة الشرعية; مصادر التشريع; أدلة الأحكام|كتاب; سنة; إجماع; قياس; مرتبة
ushul|ijma; ijma'; konsensus ulama; kesepakatan ulama; ijma sukuti; ijma sharih|الإجماع; إجماع الأمة; الإجماع السكوتي|مجتهدين; عصر; اتفاق; سكوتي; صريح
ushul|qiyas; rukun qiyas; ashl; far'; analogi hukum; qiyas jali; qiyas khafi; syarat qiyas|القياس; أركان القياس; الأصل والفرع|حكم; جامع; علة; جلي; خفي; فرع
ushul|masalik illat; cara menemukan illat; illat hukum; sabr taqsim; munasabah; illat|مسالك العلة; العلة; السبر والتقسيم; المناسبة|نص; إجماع; دوران; شبه; إيماء
ushul|istihsan; maslahah mursalah; maslahat; istishlah; mashlahah; kemaslahatan; kepentingan umum|الاستحسان; المصلحة المرسلة; المصلحة; الاستصلاح|ضرورية; حاجية; تحسينية; مقاصد; مصالح
ushul|istishhab; hukum asal; asal sesuatu; al-ashlu fil asyya'; hukum asal sesuatu; hukum asal benda|الاستصحاب; استصحاب الحال; الأصل في الأشياء|إباحة; براءة; يقين; شك; أصل
ushul|urf; adat; kebiasaan; 'urf shahih; 'urf fasid; adat kebiasaan sebagai dalil|العرف; العادة; العرف الصحيح; العرف الفاسد|عادة; تعارف; مطرد; غالب; عرف
ushul|sadd adz-dzari'ah; fathu adz-dzari'ah; menutup jalan kerusakan; dzari'ah|سد الذرائع; الذريعة; فتح الذرائع|ذريعة; مفسدة; مآل; وسيلة; ذرائع
ushul|qaul shahabi; pendapat sahabat; syar'u man qablana; syariat sebelum kita; mazhab sahabat|قول الصحابي; مذهب الصحابي; شرع من قبلنا|صحابي; شريعة; سابق; حجية; اجتهاد
ushul|amr; perintah; shighat amr; amr menunjukkan wajib; al-amru lil wujub; kaidah amr; lafaz perintah|الأمر; صيغة الأمر; الأمر للوجوب|وجوب; ندب; إباحة; تكرار; فور
ushul|nahy; larangan; nahi; an-nahyu lit-tahrim; kaidah nahy; lafaz larangan|النهي; النهي للتحريم; صيغة النهي|تحريم; كراهة; فساد; تنزيه; اقتضاء
ushul|am; khash; takhsis; mukhashshish; lafaz umum; lafaz khusus; umum dan khusus; pengkhususan|العام; الخاص; التخصيص; المخصص|عموم; خصوص; صيغ العموم; استثناء; تقييد
ushul|mutlaq; muqayyad; hamlul mutlaq alal muqayyad; lafaz mutlak; mutlak dan muqayyad|المطلق; المقيد; حمل المطلق على المقيد|إطلاق; تقييد; سبب; حكم; مطلق
ushul|mujmal; mubayyan; bayan; penjelasan nash; tabyin; lafaz mujmal|المجمل; المبين; البيان|إجمال; تبيين; تأخير البيان; وقت; مبين
ushul|zhahir; mu'awwal; nash; takwil; dalalah lafzh; lafaz zhahir; nash dan zhahir|الظاهر; المؤول; النص; التأويل; دلالة اللفظ|احتمال; دليل; راجح; مرجوح; قرينة
ushul|manthuq; mafhum; mafhum muwafaqah; mafhum mukhalafah; dalalah iqtidha; dalalah isyarah; dalalah ibarah; dalalah nash|المنطوق; المفهوم; مفهوم الموافقة; مفهوم المخالفة; دلالة الاقتضاء; دلالة الإشارة|فحوى; لحن; شرط; صفة; غاية; عدد
ushul|haqiqah; majaz; haqiqah syar'iyyah; haqiqah urfiyyah; haqiqah lughawiyyah; makna hakiki dan majazi|الحقيقة; المجاز; الحقيقة الشرعية; الحقيقة العرفية; الحقيقة اللغوية|لفظ; وضع; قرينة; استعمال; مجاز
ushul|nasikh; mansukh; naskh; penghapusan hukum; naskh tilawah; nasakh|النسخ; الناسخ; المنسوخ|رفع; حكم; تلاوة; تراخي; تعارض
ushul|ta'arudh; pertentangan dalil; tarjih; jam'; tawaqquf; kompromi dalil; dalil bertentangan|التعارض; الترجيح; الجمع|تعارض; ترجيح; جمع; توقف; نسخ
ushul|ijtihad; mujtahid; syarat mujtahid; taqlid; ittiba'; talfiq; fatwa; mufti; mustafti; bertaklid; tingkatan mujtahid|الاجتهاد; المجتهد; التقليد; الاتباع; التلفيق; الفتوى|مفتي; مستفتي; تقليد; شروط; اجتهاد
ushul|khabar ahad; hadits ahad sebagai dalil; khabar mutawatir; hujjiyah sunnah; kehujjahan hadits|خبر الواحد; الخبر المتواتر; حجية السنة|آحاد; متواتر; ظن; علم; عمل
ushul|maqashid syariah; tujuan syariat; dharuriyyat; hajiyyat; tahsiniyyat; hifzhud din; lima tujuan syariat|مقاصد الشريعة; الضروريات الخمس; الحاجيات; التحسينيات|حفظ الدين; حفظ النفس; حفظ العقل; حفظ النسل; حفظ المال
ushul|muqaddimah wajib; wajib yang tidak sempurna kecuali dengan sesuatu; sarana kewajiban|ما لا يتم الواجب إلا به; مقدمة الواجب|واجب; وسيلة; شرط; سبب; مقدمة
ushul|ahliyyah; taklif; mukallaf; syarat taklif; ahliyatul wujub; ahliyatul ada; aqil baligh; orang mukallaf|الأهلية; المكلف; التكليف; أهلية الوجوب; أهلية الأداء|عقل; بلوغ; صبي; مجنون; عوارض
ushul|mahkum fih; mahkum alaih; mahkum bih; objek hukum; unsur hukum|المحكوم فيه; المحكوم عليه; المحكوم به|فعل; مكلف; حكم; علم; قدرة
ushul|istinbath; pengambilan hukum dari nash; metode istinbath; dilalah nash|الاستنباط; دلالة النص; طرق الاستنباط|استنباط; نص; لفظ; مفهوم; دلالة
ushul|khuruj minal khilaf; keluar dari perbedaan pendapat; ihtiyath; kehati-hatian; wara fiqh|الخروج من الخلاف; الاحتياط|خلاف; أولى; مستحب; ورع; احتياط
ushul|kitab ushul; waraqat; imam haramain; jam'ul jawami'; lathaif al-isyarat; sullam al-wushul; kitab ushul fiqih|الورقات; جمع الجوامع; لطائف الإشارات; سلم الوصول|إمام الحرمين; تاج الدين السبكي; أصول الفقه; متن; شرح
# ---------- QAWAID ----------
qawaid|kaidah fiqih; qawaid fiqhiyyah; kaidah lima; kaidah asasiyyah; al-qawa'id al-khams; kaidah pokok; kaidah umum fiqih|القواعد الفقهية; القواعد الخمس; القاعدة الفقهية|خمس; أصل; ضابط; فروع; قاعدة
qawaid|amal tergantung niat; al-umur bimaqashidiha; kaidah niat; niat dalam kaidah; segala urusan tergantung tujuannya|الأمور بمقاصدها; إنما الأعمال بالنيات|نية; مقصد; قصد; عمل; فروع
qawaid|keyakinan tidak hilang dengan keraguan; al-yaqin la yazulu bis syakk; kaidah yakin dan ragu; yakin dan syak|اليقين لا يزول بالشك; الشك; اليقين|يقين; شك; ظن; أصل; استصحاب
qawaid|kesulitan mendatangkan kemudahan; al-masyaqqah tajlibut taysir; kaidah kesulitan; masyaqqah|المشقة تجلب التيسير; التيسير; المشقة|مشقة; رخصة; تخفيف; عسر; تيسير
qawaid|bahaya harus dihilangkan; la dharar wala dhirar; adh-dharar yuzal; kaidah dharar; kaidah bahaya; tidak boleh membahayakan|الضرر يزال; لا ضرر ولا ضرار; الضرر|ضرر; ضرار; مفسدة; إزالة; ضرورة
qawaid|adat dijadikan hukum; al-adatu muhakkamah; kaidah adat; adat sebagai pertimbangan hukum|العادة محكمة; العادة; العرف|عادة; عرف; اطراد; غلبة; تحكيم
qawaid|darurat membolehkan yang terlarang; adh-dharurat tubihul mahzhurat; kondisi darurat; keadaan darurat; kaidah darurat|الضرورات تبيح المحظورات; الضرورة; الضرورات|ضرورة; محظور; قدرها; اضطرار; تقدر بقدرها
qawaid|menolak kerusakan lebih didahulukan; dar'ul mafasid muqaddam; menolak mafsadah; menarik maslahat; kaidah mafsadah|درء المفاسد مقدم على جلب المصالح; درء المفاسد; جلب المصالح|مفسدة; مصلحة; تعارض; أولى; مقدم
qawaid|asal bebas tanggungan; al-ashlu bara'atudz dzimmah; bara'ah ashliyyah; kaidah bebas tanggungan|الأصل براءة الذمة; البراءة الأصلية|ذمة; براءة; أصل; دين; إثبات
qawaid|kaidah pengikut; at-tabi' tabi'; sesuatu yang mengikuti; kaidah tabi'|التابع تابع; التبعية|تابع; متبوع; فرع; أصل; استقلال
qawaid|kaidah ushuliyah; qawa'id ushuliyyah; kaidah ushul; kaidah lughawiyah|القواعد الأصولية; القواعد اللغوية|قاعدة; أصل; استنباط; لغوية; أمر
qawaid|al-asybah wan nazha'ir; kitab kaidah; kaidah suyuthi; kaidah ibnu nujaim; al-faraid al-bahiyyah|الأشباه والنظائر; القواعد الفقهية; الفرائد البهية|سيوطي; ابن نجيم; سبكي; فروع; قواعد
# ---------- BALAGHAH ----------
balaghah|balaghah; ilmu balaghah; ma'ani; bayan; pembagian balaghah; tiga cabang balaghah|البلاغة; علم البلاغة; المعاني; البيان; البديع|فصاحة; مطابقة; مقتضى الحال; بلاغة; كلام
balaghah|fashahah; fashih; kefasihan; syarat kata fashih; fashahatul kalimah; fashahatul kalam|الفصاحة; الفصيح; فصاحة الكلمة; فصاحة الكلام|كلمة; كلام; متكلم; غرابة; تنافر
balaghah|khabar; insya; kalam khabar; kalam insya; khabar ibtida'i; thalabi; inkari; macam kalimat khabar|الخبر; الإنشاء; الكلام الخبري; الكلام الإنشائي|ابتدائي; طلبي; إنكاري; فائدة الخبر; لازم الفائدة
balaghah|insya thalabi; amr nahyi istifham tamanni nida; insya ghairu thalabi; macam insya|الإنشاء الطلبي; الاستفهام; التمني; النداء|أمر; نهي; عرض; تحضيض; ترج
balaghah|qashr; pembatasan; hasr; ikhtishash; kalimat pembatasan; thuruq al-qashr|القصر; الحصر; طرق القصر|إنما; نفي واستثناء; مقصور; مقصور عليه; تقديم
balaghah|fashl; washl; athaf; kamal ittishal; kamal inqitha; pemisahan kalimat; penggabungan kalimat; al-fashl wal washl|الفصل والوصل; كمال الاتصال; كمال الانقطاع|عطف; واو; جملة; موضع; محل من الإعراب
balaghah|ijaz; ithnab; musawah; ringkas; bertele-tele; ijaz qashr; ijaz hadzf|الإيجاز; الإطناب; المساواة|حذف; قصر; تكرار; ذكر الخاص بعد العام; إيجاز
balaghah|taqdim; ta'khir; mendahulukan; mengakhirkan; taqdim ta'khir; alasan mendahulukan kata|التقديم والتأخير; تقديم المسند إليه; تقديم المعمول|اختصاص; اهتمام; تشويق; رتبة; تقديم
balaghah|dzikr; hadzf; pembuangan kata; penyebutan kata; ta'rif; tankir; ma'rifah nakirah; alasan membuang|الذكر والحذف; التعريف والتنكير; الحذف|ذكر; حذف; معرفة; نكرة; قرينة
balaghah|tasybih; musyabbah; musyabbah bih; wajh syabah; adat tasybih; tasybih baligh; tasybih tamtsili; perumpamaan|التشبيه; المشبه; المشبه به; وجه الشبه; أداة التشبيه; التشبيه البليغ|مؤكد; مرسل; مجمل; مفصل; تمثيل; كاف
balaghah|majaz; majaz mursal; majaz aqli; isti'arah; isti'arah tashrihiyyah; isti'arah makniyyah; istiarah; metafora|المجاز; المجاز المرسل; المجاز العقلي; الاستعارة; الاستعارة التصريحية; الاستعارة المكنية|علاقة; قرينة; مستعار; مستعار منه; مستعار له; مكني
balaghah|kinayah; kinayah sifat; kinayah maushuf; ta'ridh; talwih; ramz; kiasan|الكناية; التعريض; التلويح|لازم; ملزوم; إرادة; معنى; كناية
balaghah|badi'; muhassinat lafzhiyah; muhassinat ma'nawiyah; jinas; thibaq; muqabalah; saj'; tauriyah; husnu ta'lil; majas badi'|البديع; المحسنات اللفظية; المحسنات المعنوية; الجناس; الطباق; المقابلة; السجع; التورية|تام; ناقص; إيجاب; سلب; توافق
balaghah|muqtadhal hal; sesuai keadaan; lakulli maqam maqal; kesesuaian ucapan dengan keadaan; maqam dan hal|مقتضى الحال; لكل مقام مقال; المقام|حال; مخاطب; سياق; مطابقة; مقام
balaghah|iltifat; tajrid; tadmin; iqtibas; i'tiradh; perpindahan gaya bahasa|الالتفات; الاعتراض; التضمين; الاقتباس|تلوين; خطاب; غيبة; تكلم; التفات
balaghah|kitab balaghah; jauhar maknun; talkhis miftah; al-balaghah al-wadhihah; uqud al-juman; dalail al-i'jaz|الجوهر المكنون; تلخيص المفتاح; البلاغة الواضحة; عقود الجمان; دلائل الإعجاز|قزويني; سكاكي; جرجاني; أخضري; متن
# ---------- NAHWU ----------
nahwu|i'rab; mu'rab; mabni; tanda i'rab; alamat i'rab; rafa; nashab; jar; jazm; macam i'rab|الإعراب; المعرب; المبني; علامات الإعراب; الرفع; النصب; الجر; الجزم|ضمة; فتحة; كسرة; سكون; واو; ألف; ياء; نون
nahwu|isim; fi'il; harf; pembagian kalimat; tanda isim; tanda fi'il; kalimat; jenis kata; kalam|الكلمة; الاسم; الفعل; الحرف; الكلام|علامات; تنوين; قد; سين; ياء; اسم
nahwu|mubtada; khabar; mubtada khabar; jumlah ismiyah; mubtada dan khabar; kalimat nominal|المبتدأ; الخبر; الجملة الاسمية|مرفوع; ابتداء; معرفة; نكرة; جملة
nahwu|fa'il; naibul fa'il; pelaku; fa'il dan naib fa'il; kalimat pasif; subjek|الفاعل; نائب الفاعل; الفاعل ونائبه|فعل; مبني للمجهول; مرفوع; مجهول; ضمير
nahwu|kana dan saudaranya; kana wa akhawatuha; kaana; shaara; laisa; isim kana; khabar kana; amil nawasikh|كان وأخواتها; اسم كان; خبر كان; النواسخ|كان; صار; ليس; أصبح; أمسى; ظل
nahwu|inna dan saudaranya; inna wa akhawatuha; anna; lakinna; laita; la'alla; isim inna; khabar inna|إن وأخواتها; اسم إن; خبر إن|إن; أن; لكن; ليت; لعل; كأن
nahwu|zhanna dan saudaranya; zhanna wa akhawatuha; af'alul qulub; fi'il yang menashabkan dua maf'ul|ظن وأخواتها; أفعال القلوب; أفعال اليقين والرجحان|ظن; حسب; خال; رأى; علم; وجد
nahwu|maf'ul bih; maf'ul mutlak; maf'ul li ajlih; maf'ul fih; maf'ul ma'ah; maf'ulat; objek; keterangan tempat dan waktu|المفعول به; المفعول المطلق; المفعول لأجله; المفعول فيه; المفعول معه; المفاعيل|منصوب; ظرف; مصدر; سبب; معية
nahwu|hal; tamyiz; mustatsna; istitsna; pengecualian; keterangan keadaan; hal dan tamyiz|الحال; التمييز; المستثنى; الاستثناء|منصوب; هيئة; إلا; غير; سوى; نكرة
nahwu|mudhaf; mudhaf ilaih; idhafah; huruf jar; majrur; kata majrur; idhafah dalam bahasa arab|المضاف; المضاف إليه; الإضافة; حروف الجر; المجرور|جر; معنوية; لفظية; من; إلى; في
nahwu|tawabi'; na't; athaf; taukid; badal; sifat; kata penyerta; tabi'|التوابع; النعت; العطف; التوكيد; البدل|صفة; معطوف; منعوت; حروف العطف; تابع
nahwu|jumlah; jumlah fi'liyah; jumlah syarthiyah; adawat syarat; jawab syarat; jazm fi'il mudhari; kalimat syarat; fi'il syarat|الجملة; الجملة الفعلية; أدوات الشرط; جواب الشرط; الجزم|إن; من; ما; إذا; لو; لم; لما; لا الناهية
nahwu|fi'il madhi; fi'il mudhari; fi'il amr; fi'il mudhari manshub; nawashib; jawazim; kata kerja; tashrif fi'il|الفعل الماضي; الفعل المضارع; فعل الأمر; النواصب; الجوازم|أن; لن; كي; إذن; لم; لما; لام الأمر
nahwu|isim fa'il; isim maf'ul; shifat musyabbahah; isim tafdhil; isim zaman; isim makan; isim alat; kata turunan; isim musytaq|اسم الفاعل; اسم المفعول; الصفة المشبهة; اسم التفضيل; اسم الزمان; اسم المكان; اسم الآلة|مشتق; فاعل; مفعول; أفعل; وزن
nahwu|isim isyarah; isim maushul; dhamir; isim nakirah; isim ma'rifah; ma'rifah nakirah; kata ganti; kata tunjuk|اسم الإشارة; الاسم الموصول; الضمير; المعرفة; النكرة|هذا; الذي; متصل; منفصل; صلة
nahwu|mutsanna; jama'; mudzakkar muannats; jama' mudzakkar salim; jama' muannats salim; jama' taksir; isim tatsniyah; bentuk jamak|المثنى; الجمع; جمع المذكر السالم; جمع المؤنث السالم; جمع التكسير; المذكر والمؤنث|ألف ونون; ياء ونون; ألف وتاء; منتهى الجموع; تثنية
nahwu|isim ghairu munsharif; mamnu minash sharf; tidak menerima tanwin; mamnu' minash sharf; kata tanpa tanwin|الممنوع من الصرف; غير المنصرف; ما لا ينصرف|فتحة; تنوين; علة; علتان; أفعل; فعلان
nahwu|asmaul khamsah; af'alul khamsah; isim lima; fi'il lima; asma khamsah|الأسماء الخمسة; الأفعال الخمسة|أب; أخ; حم; فو; ذو; تفعلان; يفعلون
nahwu|la nafiyah lil jins; nida; munada; nidaa; kata seru; huruf nida|لا النافية للجنس; النداء; المنادى|يا; مبني; مضموم; منصوب; نكرة مقصودة
nahwu|ta'ajjub; madh dzamm; ni'ma bi'sa; af'al ta'ajjub; kalimat takjub; pujian dan celaan|التعجب; المدح والذم; نعم وبئس|ما أفعله; أفعل به; فاعل نعم; مخصوص; تعجب
nahwu|kitab nahwu; jurumiyah; imrithi; alfiyah; ibnu malik; mutammimah; kawakib durriyyah; ibnu aqil|الآجرومية; العمريطي; الألفية; ابن مالك; المتممة; الكواكب الدرية; ابن عقيل|متن; شرح; نظم; ابن آجروم; حاشية
# ---------- SHARAF ----------
sharaf|tashrif; sharaf; shorof; wazan; fi'il tsulatsi; fi'il ruba'i; mujarrad; mazid; ilmu sharaf; ilmu shorof|التصريف; الصرف; الوزن; الثلاثي; الرباعي; المجرد; المزيد|فعل; فعلل; أبواب; حروف الزيادة; أصل
sharaf|bab tsulatsi mujarrad; fa'ala yaf'ulu; fa'ala yaf'ilu; fa'ila yaf'alu; enam bab fi'il; bab fi'il tsulatsi|أبواب الثلاثي المجرد; نصر ينصر; ضرب يضرب; فتح يفتح|ضم; كسر; فتح; عين الفعل; مضارع
sharaf|tsulatsi mazid; af'ala; fa''ala; fa'ala; tafa''ala; infa'ala; ifta'ala; istaf'ala; wazan mazid; fi'il mazid|الثلاثي المزيد; أفعل; فعل; فاعل; تفعل; انفعل; افتعل; استفعل|زيادة; حرف; معنى; تعدية; مزيد
sharaf|shahih mu'tal; mitsal; ajwaf; naqish; lafif; mahmuz; mudha'af; fi'il shahih; fi'il mu'tal|الصحيح; المعتل; المثال; الأجوف; الناقص; اللفيف; المهموز; المضعف|علة; واو; ياء; همزة; تضعيف
sharaf|i'lal; ibdal; idgham; qalb; hadzf; naql; penukaran huruf; perubahan huruf; kaidah i'lal|الإعلال; الإبدال; الإدغام; القلب; الحذف; النقل|قلب; إسكان; تخفيف; علة; إبدال
sharaf|isytiqaq; isytiqaq shaghir; isytiqaq kabir; mashdar; masdar; kata dasar; derivasi|الاشتقاق; المصدر; الاشتقاق الصغير|مشتق; جامد; أصل; فرع; مصدر
sharaf|jamid; musytaq; jamid musytaq; kata jamid; isim jamid|الجامد; المشتق; الاسم الجامد|مصدر; اسم ذات; اسم معنى; جامد
sharaf|fi'il lazim; fi'il muta'addi; transitif; intransitif; lazim dan muta'addi|اللازم; المتعدي; الفعل اللازم; الفعل المتعدي|مفعول; تعدية; فاعل; لازم
sharaf|mabni lil majhul; mabni lil ma'lum; fi'il pasif; fi'il aktif; kalimat pasif|المبني للمجهول; المبني للمعلوم|مجهول; معلوم; ضم; كسر; فاعل
sharaf|ta marbuthah; alamat ta'nits; mudzakkar muannats; muannats|التأنيث; علامة التأنيث; التاء المربوطة|تاء; ألف مقصورة; ممدودة; تأنيث; مؤنث
sharaf|nisbah; tashghir; wazan tashghir; isim mansub; kata nisbah; bentuk diminutif|النسبة; التصغير; المنسوب|ياء مشددة; فعيل; فعيعل; نسب; مصغر
# ---------- TAFSIR ----------
tafsir|metode tafsir; tafsir bil ma'tsur; tafsir bir ra'yi; tafsir isyari; tafsir tahlili; tafsir maudhu'i; tafsir muqarin; macam tafsir; corak tafsir|التفسير; التفسير بالمأثور; التفسير بالرأي; التفسير الإشاري; التفسير التحليلي; التفسير الموضوعي|مأثور; رأي; إشارة; شروط المفسر; منهج
tafsir|ta'wil; beda tafsir dan ta'wil; takwil quran; perbedaan tafsir dan takwil|التأويل; الفرق بين التفسير والتأويل|ظاهر; مرجوح; معنى; ترجيح; تأويل
tafsir|ayat ahkam; tafsir ahkam; ayat hukum; ayat-ayat hukum; tafsir hukum|آيات الأحكام; تفسير آيات الأحكام|حكم; استنباط; فقهي; جصاص; أحكام القرآن
tafsir|gharib quran; mufradat quran; makna kata quran; wujuh nazha'ir; musytarak lafzhi; kosakata al-quran; arti kata dalam al-quran|غريب القرآن; مفردات القرآن; الوجوه والنظائر|لفظ; وجه; معنى; مشترك; مفردة
tafsir|fawatih suwar; huruf muqaththa'ah; alif lam mim; awal surah; huruf di awal surat|فواتح السور; الحروف المقطعة|ألم; حم; طس; يس; فواتح
tafsir|israiliyyat; kisah israiliyat; isra'iliyat dalam tafsir; riwayat israiliyat|الإسرائيليات; الدخيل في التفسير|كعب الأحبار; وهب بن منبه; نقل; مردود; توقف
tafsir|tafsir jalalain; tafsir ibnu katsir; tafsir thabari; tafsir qurthubi; tafsir al-razi; tafsir al-baidhawi; kitab tafsir; tafsir al-munir; tafsir al-azhar|تفسير الجلالين; تفسير ابن كثير; تفسير الطبري; تفسير القرطبي; مفاتيح الغيب; أنوار التنزيل|جلال الدين المحلي; السيوطي; ابن جرير; مفسر; تفسير
tafsir|tafsir ayat; maksud ayat; arti ayat; penafsiran ayat; makna ayat; tafsir surat|تفسير الآية; معنى الآية; المراد بالآية|مراد; سياق; أقوال; قيل; قوله تعالى
# ---------- ULUMUL QURAN ----------
ulumul_quran|asbabun nuzul; sebab turun ayat; sebab nuzul; sabab nuzul; riwayat turunnya ayat|أسباب النزول; سبب النزول; نزلت|عموم اللفظ; خصوص السبب; رواية; واقعة; نزول
ulumul_quran|makki madani; surat makkiyyah; madaniyyah; ayat makkiyah; ciri ayat makkiyah; ciri ayat madaniyah|المكي والمدني; مكية; مدنية|هجرة; خطاب; يا أيها الناس; يا أيها الذين آمنوا; سورة
ulumul_quran|muhkam mutasyabih; ayat muhkamat; ayat mutasyabihat; mutasyabihat; ayat muhkam|المحكم والمتشابه; آيات محكمات; المتشابه|محكم; متشابه; تأويل; راسخون; إحكام
ulumul_quran|nasikh mansukh quran; naskh dalam al-quran; ayat yang dihapus; ayat nasikh|الناسخ والمنسوخ في القرآن; نسخ الآيات|نسخ; تلاوة; حكم; رفع; آية السيف
ulumul_quran|qira'at; qira'at sab'ah; qira'at asyrah; riwayat hafsh; warsy; imam qira'at; ahruf sab'ah; sab'atu ahruf; tujuh bacaan|القراءات; القراءات السبع; القراءات العشر; حفص; ورش; الأحرف السبعة|عاصم; نافع; تواتر; شاذ; قراءة
ulumul_quran|i'jaz quran; kemukjizatan quran; tahaddi; mukjizat al-quran; keistimewaan al-quran|إعجاز القرآن; الإعجاز; التحدي|بلاغة; تشريع; غيب; علمي; معجزة
ulumul_quran|jam'ul quran; kodifikasi quran; mushaf utsmani; rasm utsmani; penulisan mushaf; rasm; pengumpulan al-quran; sejarah penulisan al-quran|جمع القرآن; المصحف العثماني; الرسم العثماني; كتابة القرآن|أبو بكر; عثمان; زيد بن ثابت; مصحف; رسم
ulumul_quran|amtsal quran; aqsam quran; qashash quran; perumpamaan quran; sumpah dalam quran; kisah quran; kisah dalam al-quran|أمثال القرآن; أقسام القرآن; قصص القرآن|مثل; قسم; قصة; عبرة; أمثال
ulumul_quran|asma'ul quran; nama-nama al-quran; jumlah surah; jumlah ayat quran; juz quran; jumlah juz|أسماء القرآن; عدد السور; عدد الآيات; الأجزاء|مائة وأربع عشرة; ثلاثون; سورة; آية; جزء
ulumul_quran|ayat sajdah; ayat sajadah; sujud tilawah ayat; tempat sujud tilawah; jumlah ayat sajdah|آيات السجدة; مواضع السجود|أربع عشرة; سجدة; تلاوة; موضع
ulumul_quran|adab membaca quran; adab tilawah; adab hamalatul quran; adab pembaca quran; etika membaca al-quran|آداب تلاوة القرآن; آداب حملة القرآن; التلاوة|طهارة; ترتيل; تدبر; استعاذة; خشوع
ulumul_quran|wahyu; macam wahyu; cara turunnya wahyu; nuzulul quran; turunnya al-quran; tahapan turunnya al-quran|الوحي; نزول القرآن; أنواع الوحي|لوح محفوظ; بيت العزة; منجما; جبريل; نجوم
ulumul_quran|kitab ulumul quran; al-itqan; al-burhan; manahilul irfan; mabahits fi ulumil quran; kitab ilmu al-quran|الإتقان في علوم القرآن; البرهان في علوم القرآن; مناهل العرفان|سيوطي; زركشي; زرقاني; قطان; علوم القرآن
# ---------- TAJWID ----------
tajwid|tajwid; ilmu tajwid; hukum tajwid; makhraj huruf; sifat huruf; hukum bacaan; cara membaca al-quran|التجويد; علم التجويد; أحكام التجويد; مخارج الحروف; صفات الحروف|مخرج; صفة; ترتيل; لحن; حرف
tajwid|nun mati dan tanwin; izhhar halqi; idgham bighunnah; idgham bilaghunnah; iqlab; ikhfa haqiqi; hukum nun sukun; hukum tanwin|أحكام النون الساكنة والتنوين; الإظهار الحلقي; الإدغام بغنة; الإدغام بغير غنة; الإقلاب; الإخفاء الحقيقي|غنة; حروف الحلق; يرملون; ميم; باء
tajwid|mim mati; ikhfa syafawi; idgham mimi; izhhar syafawi; hukum mim sukun; hukum mim mati|أحكام الميم الساكنة; الإخفاء الشفوي; الإدغام الشفوي|شفوي; ميم; باء; غنة; إظهار
tajwid|mad; mad thabi'i; mad wajib muttashil; mad jaiz munfashil; mad lazim; mad aridh lissukun; mad layyin; mad badal; mad shilah; hukum mad; panjang bacaan|المد; المد الطبيعي; المد الواجب المتصل; المد الجائز المنفصل; المد اللازم; المد العارض للسكون; مد اللين|حركتين; أربع; خمس; ست; همزة
tajwid|qalqalah; qalqalah sughra; qalqalah kubra; huruf qalqalah; hukum qalqalah|القلقلة; حروف القلقلة|قطب جد; سكون; وقف; اضطراب; قلقلة
tajwid|tafkhim; tarqiq; ra tafkhim; lafzh allah tafkhim; lam jalalah; hukum ra; hukum lam jalalah|التفخيم; الترقيق; تفخيم الراء; لام الجلالة|راء; لام; مستعلية; استفال; إطباق
tajwid|waqaf; ibtida'; washal; saktah; waqaf tam; waqaf kafi; waqaf hasan; waqaf qabih; tanda waqaf; berhenti membaca|الوقف والابتداء; الوقف; الابتداء; الوصل; السكتة; الوقف التام; الوقف الكافي; الوقف الحسن; الوقف القبيح|تام; كاف; حسن; قبيح; مطلق; مجوز
tajwid|ghunnah; idgham mutamatsilain; mutajanisain; mutaqaribain; idgham kabir; idgham shaghir; macam idgham|الغنة; المتماثلين; المتجانسين; المتقاربين|إدغام; تماثل; تجانس; تقارب; غنة
tajwid|lahn jali; lahn khafi; kesalahan membaca quran; lahn; salah baca quran|اللحن الجلي; اللحن الخفي; اللحن|خطأ; تغيير; إعراب; معنى; لحن
tajwid|huruf hijaiyah; huruf izhhar; huruf halqi; huruf istila; huruf syamsiyah qamariyah; alif lam syamsiyah; alif lam qamariyah; jumlah huruf hijaiyah|الحروف الهجائية; حروف الحلق; حروف الاستعلاء; اللام الشمسية; اللام القمرية|ست; سبع; ثلاث عشرة; شمسية; قمرية
# ---------- MUSTALAH HADITS ----------
mustalah|hadits shahih; syarat hadits shahih; shahih lidzatihi; shahih lighairihi; hadis sahih; ciri hadits shahih|الحديث الصحيح; شروط الحديث الصحيح; الصحيح لذاته; الصحيح لغيره|اتصال السند; عدالة; ضبط; شذوذ; علة
mustalah|hadits hasan; hasan lidzatihi; hasan lighairihi; derajat hasan; hadis hasan|الحديث الحسن; الحسن لذاته; الحسن لغيره|خفة الضبط; تعدد الطرق; ترمذي; حسن; شروط
mustalah|hadits dhaif; hadits lemah; sebab dhaif; hukum beramal dengan hadits dhaif; fadhail a'mal; hadis dhaif; hadits daif|الحديث الضعيف; العمل بالحديث الضعيف; فضائل الأعمال|ضعف; سقط; طعن; شروط; ترغيب
mustalah|hadits maudhu; hadits palsu; pemalsu hadits; tanda hadits palsu; hadis maudhu; hukum meriwayatkan hadits palsu|الحديث الموضوع; الموضوع; الوضع; الوضاعون|كذب; وضع; قرائن; كذاب; اختلاق
mustalah|hadits mutawatir; hadits ahad; masyhur; aziz; gharib; hadits gharib; pembagian hadits ditinjau dari jumlah perawi; macam hadits ahad|الحديث المتواتر; الآحاد; المشهور; العزيز; الغريب|عدد; طبقات; تواطؤ; فرد; متواتر
mustalah|sanad; matan; rawi; isnad; rangkaian perawi; mata rantai; bagian hadits; unsur hadits|السند; المتن; الراوي; الإسناد|رجال; طبقة; عنعنة; سماع; سلسلة
mustalah|hadits mursal; munqathi'; mu'dhal; mu'allaq; mudallas; tadlis; hadits terputus sanad; macam hadits dhaif karena sanad terputus|المرسل; المنقطع; المعضل; المعلق; المدلس; التدليس|سقط; تابعي; انقطاع; عنعنة; إرسال
mustalah|hadits mu'allal; syadz; munkar; matruk; mudraj; maqlub; mudhtharib; mushahhaf; muharraf; hadits syadz; hadits munkar|المعلل; الشاذ; المنكر; المتروك; المدرج; المقلوب; المضطرب; المصحف; المحرف|علة; مخالفة; ثقة; إدراج; اضطراب
mustalah|jarh dan ta'dil; jarh wa ta'dil; ilmu rijal; adalah dhabth; rawi tsiqah; perawi tsiqah; kriteria perawi; tingkatan jarh ta'dil|الجرح والتعديل; علم الرجال; العدالة; الضبط; الثقة|ثقة; صدوق; مقبول; ضعيف; متروك; مراتب
mustalah|tahammul wa ada'; sima'; qira'ah; ijazah; munawalah; wijadah; mukatabah; cara menerima hadits; metode penerimaan hadits|التحمل والأداء; السماع; القراءة; الإجازة; المناولة; الوجادة; المكاتبة|حدثنا; أخبرنا; أنبأنا; عن; سمعت
mustalah|mutaba'ah; syahid; i'tibar; hadits mutaba'ah; penguat hadits; hadits syahid|المتابعة; الشاهد; الاعتبار|متابع; شاهد; تقوية; طريق; اعتبار
mustalah|hadits marfu'; mauquf; maqthu'; hadits qudsi; hadits qauli fi'li taqriri; macam hadits ditinjau dari sandaran; hadits qudsi dan nabawi|المرفوع; الموقوف; المقطوع; الحديث القدسي; التقرير|نبي; صحابي; تابعي; قول; فعل; إقرار
mustalah|kutub sittah; kitab hadits enam; shahihain; sunan arba'ah; musnad; mu'jam; jami'; mustadrak; kitab hadits induk; kitab induk hadits|الكتب الستة; الصحيحان; السنن الأربعة; المسند; المعجم; الجامع; المستدرك|بخاري; مسلم; أبو داود; ترمذي; نسائي; ابن ماجه; أحمد
mustalah|takhrij hadits; mukharrij; ramz hadits; rawahu al-bukhari; muttafaq alaih; rawahul jama'ah; riwayat hadits; istilah perawi hadits|التخريج; تخريج الحديث; المخرج; متفق عليه; رواه الجماعة|رواه; أخرجه; الشيخان; السنن; الجماعة
mustalah|shahabi; tabi'in; tabi' tabi'in; thabaqat shahabat; mukhdhram; shuhbah; definisi sahabat; sahabat nabi; tingkatan perawi|الصحابي; التابعي; أتباع التابعين; المخضرم; الطبقات|صحبة; لقي; مؤمنا; مات على الإسلام; طبقة
mustalah|ziyadatuts tsiqah; hadits mukhtalaf; mukhtalaf hadits; ta'arudh hadits; hadits bertentangan; mukhtalaful hadits; gharib hadits|زيادة الثقة; مختلف الحديث; الناسخ والمنسوخ في الحديث; غريب الحديث|جمع; ترجيح; توقف; نسخ; تعارض
mustalah|martabat hadits; hadits paling shahih; ashahhul asanid; derajat kitab hadits; tingkatan hadits shahih; urutan kitab hadits|أصح الأسانيد; مراتب الصحيح; أصح الكتب|بخاري; مسلم; شرط الشيخين; مالك عن نافع; مراتب
mustalah|musthalah hadits; ilmu hadits; ulumul hadits; ilmu musthalah; dirayah hadits; riwayah hadits; kitab musthalah; baiquniyyah; nukhbatul fikar|مصطلح الحديث; علوم الحديث; علم الدراية; علم الرواية; البيقونية; نخبة الفكر|ابن الصلاح; ابن حجر; بيقوني; متن; تعريف
# ---------- HADITS ----------
hadits|pengertian hadits; sunnah; hadits dan sunnah; khabar; atsar; definisi hadits; hadits nabawi|الحديث; السنة; الخبر; الأثر|قول; فعل; تقرير; صفة; نبي
hadits|syarah hadits; penjelasan hadits; makna hadits; fiqih hadits; faedah hadits; kandungan hadits; maksud hadits|شرح الحديث; معنى الحديث; فقه الحديث; فوائد الحديث|شارح; معنى; مفردات; فوائد; حديث
hadits|hadits arba'in; arba'in nawawi; riyadhus shalihin; bulughul maram; umdatul ahkam; kitab hadits ahkam; hadits pilihan|الأربعون النووية; رياض الصالحين; بلوغ المرام; عمدة الأحكام|نووي; ابن حجر; مقدسي; باب; حديث
hadits|hadits niat; innamal a'malu binniyyat; hadits tentang niat; niat dalam hadits|إنما الأعمال بالنيات; حديث النية|نية; هجرة; عمر; أعمال; امرئ
hadits|hadits jibril; iman islam ihsan dalam hadits; hadits tentang iman islam ihsan|حديث جبريل; الإيمان والإسلام والإحسان|جبريل; سائل; ساعة; أمارات; عمر
hadits|hadits targhib tarhib; keutamaan amal; fadhail a'mal; ancaman dalam hadits; anjuran dalam hadits|الترغيب والترهيب; فضائل الأعمال|ترغيب; ترهيب; فضل; وعيد; ثواب
# ---------- SIRAH DAN TARIKH ----------
sirah|hijrah; hijrah nabi; hijrah ke habasyah; hijrah ke madinah; baiat aqabah; peristiwa hijrah|الهجرة; هجرة النبي; الهجرة إلى الحبشة; بيعة العقبة|مكة; المدينة; غار ثور; أبو بكر; قباء
sirah|perang badar; perang uhud; perang khandaq; perang ahzab; perang hunain; perang tabuk; ghazwah; sariyyah; peperangan nabi|غزوة بدر; غزوة أحد; غزوة الخندق; غزوة حنين; غزوة تبوك; السرايا|مسلمين; مشركين; قريش; ثلاثمائة; رماة
sirah|fathu makkah; penaklukan mekah; pembebasan mekah; fathu mekah|فتح مكة; الفتح|عشرة آلاف; الكعبة; أصنام; عفو; رمضان
sirah|khulafaur rasyidin; abu bakar; umar; utsman; ali; pengangkatan khalifah; saqifah; empat khalifah|الخلفاء الراشدون; أبو بكر; عمر; عثمان; علي; السقيفة|خلافة; بيعة; شورى; ستة; خليفة
sirah|perjanjian hudaibiyah; baiat ridhwan; piagam madinah; sahifah madinah; perjanjian hudaibiyyah|صلح الحديبية; بيعة الرضوان; وثيقة المدينة; الصحيفة|قريش; سنة ست; معاهدة; يهود; حديبية
sirah|kelahiran nabi; maulid nabi; tahun gajah; masa kecil nabi; halimah; nasab nabi; silsilah nabi; riwayat hidup nabi|مولد النبي; عام الفيل; نسب النبي; حليمة السعدية|عبد الله; آمنة; عبد المطلب; أبو طالب; ربيع الأول
sirah|wahyu pertama; gua hira; kenabian muhammad; dakwah sirriyyah; dakwah jahriyyah; khadijah; awal kenabian|بدء الوحي; غار حراء; الدعوة السرية; الدعوة الجهرية; خديجة|اقرأ; جبريل; أربعين; ورقة بن نوفل; نبوة
sirah|isra mi'raj; isra' mi'raj; shalat lima waktu; perjalanan malam; peristiwa isra mikraj|الإسراء والمعراج; الإسراء; المعراج|بيت المقدس; سدرة المنتهى; خمسين; براق; صلاة
sirah|istri nabi; ummahatul mukminin; anak nabi; putri nabi; keluarga nabi; ahlul bait|أمهات المؤمنين; أزواج النبي; بنات النبي; آل البيت|خديجة; عائشة; فاطمة; زينب; حفصة
sirah|sepuluh sahabat dijamin surga; asyarah mubasysyarah; ahli badar; sahabat nabi terkemuka|العشرة المبشرون بالجنة; الصحابة; أهل بدر|طلحة; زبير; سعد; عبد الرحمن بن عوف; أبو عبيدة
sirah|bani umayyah; bani abbasiyah; daulah islamiyah; khilafah usmaniyah; perkembangan islam; sejarah islam; dinasti islam|الدولة الأموية; الدولة العباسية; الخلافة العثمانية; التاريخ الإسلامي|معاوية; بغداد; دمشق; خلافة; سقوط
sirah|tarikh tasyri'; sejarah hukum islam; sejarah mazhab; imam mazhab empat; biografi imam syafi'i; imam abu hanifah; imam malik; imam ahmad; empat imam|تاريخ التشريع; الأئمة الأربعة; أبو حنيفة; مالك; الشافعي; أحمد بن حنبل|مذهب; ولد; توفي; موطأ; رسالة; مسند
# ---------- MANTIQ ----------
mantiq|mantiq; ilmu mantiq; logika; tashawwur; tashdiq; kulli; juz'i; ilmu logika|المنطق; علم المنطق; التصور; التصديق; الكلي; الجزئي|كلي; جزئي; نسبة; حد; رسم
mantiq|qiyas mantiqi; silogisme; muqaddimah shughra; kubra; natijah; burhan; jadal; khithabah; premis; kesimpulan|القياس المنطقي; الصغرى; الكبرى; النتيجة; البرهان; الجدل; الخطابة|حد أوسط; شكل; اقتراني; استثنائي; مقدمة
mantiq|kulliyat khams; jins; nau'; fashl; khashshah; aradh am; lima kulli; kulliyat lima; isagoji|الكليات الخمس; الجنس; النوع; الفصل; الخاصة; العرض العام|ماهية; ذاتي; عرضي; حد تام; إيساغوجي
mantiq|hadd; rasm; ta'rif mantiq; definisi menurut mantiq; hadd tam; rasm naqish; cara mendefinisikan|الحد; الرسم; التعريف; الحد التام; الرسم الناقص|جامع; مانع; جنس; فصل; تعريف
mantiq|qadhiyyah; hamliyyah; syarthiyyah; mutlaqah; mawjubah; salibah; proposisi; kalimat logika|القضية; الحملية; الشرطية; الموجبة; السالبة|موضوع; محمول; كلية; جزئية; قضية
# ---------- ISTILAH MAZHAB DAN KITAB ----------
mazhab|istilah mazhab syafi'i; al-ashahh; al-azhhar; al-mu'tamad; asy-syaikhan; qaul qadim; qaul jadid; wajh; thariqah; istilah tarjih syafi'iyah; arti al-ashah|الأصح; الأظهر; المعتمد; الشيخان; القول القديم; القول الجديد; الوجه; الطريقة|نووي; رافعي; ابن حجر; رملي; المذهب
mazhab|istilah mazhab hanafi; mazhab maliki; mazhab hanbali; pendapat abu hanifah; shahibain; zhahirur riwayah; istilah mazhab lain|مذهب الحنفية; مذهب المالكية; مذهب الحنابلة; الصاحبان; ظاهر الرواية|أبو يوسف; محمد; المدونة; المنتهى; المفتى به
mazhab|ibnu hajar; ar-ramli; nihayatul muhtaj; tuhfatul muhtaj; mughnil muhtaj; fathul mu'in; fathul qarib; i'anatuth thalibin; hasyiyah; kitab fiqih syafi'i; kitab rujukan syafi'iyah|ابن حجر; الرملي; نهاية المحتاج; تحفة المحتاج; مغني المحتاج; فتح المعين; فتح القريب; إعانة الطالبين|متن; شرح; حاشية; تقرير; قوله
mazhab|matan syarah hasyiyah; istilah kitab kuning; qaulihi; qaulul mushannif; cara membaca kitab kuning; struktur kitab kuning; kitab kuning|المتن; الشرح; الحاشية; قوله; أقول|مصنف; شارح; محشي; ماتن; تعليق
`;

// Keluarga kata ilmu-ilmu: bentuk kata benda/kerja/jamak dan sinonim SEJATI (bukan sekadar berkaitan).
export const KELUARGA_ILMU = [
  // akidah
  ['قدرة', 'قادر', 'قدير', 'مقدور'], ['إرادة', 'مريد', 'أراد', 'يريد'], ['علم', 'عالم', 'عليم', 'معلوم'], ['حياة', 'حي', 'حيي'], ['سمع', 'سميع', 'مسموع'], ['بصر', 'بصير', 'مبصر'],
  ['قدم', 'قديم', 'أزلي', 'أزل'], ['حدوث', 'حادث', 'حوادث', 'محدث'], ['بقاء', 'باقي', 'يبقى'], ['وجود', 'موجود', 'وجد'], ['مستحيل', 'استحالة'], ['جائز', 'جواز', 'ممكن', 'إمكان'],
  ['نبي', 'أنبياء', 'نبوة'], ['معجزة', 'معجزات', 'إعجاز', 'معجز'], ['كرامة', 'كرامات', 'أولياء'], ['قيامة', 'بعث', 'حشر', 'نشر', 'معاد'], ['ميزان', 'موازين'], ['شفاعة', 'شفيع', 'يشفع'],
  ['جنة', 'جنات', 'فردوس'], ['نار', 'جهنم', 'سعير'], ['عذاب', 'عقاب'], ['ثواب', 'أجر', 'مثوبة'], ['قدر', 'قضاء', 'تقدير'], ['كسب', 'اكتساب', 'مكتسب'], ['إيمان', 'مؤمن', 'يؤمن', 'آمن'],
  ['كفر', 'كافر', 'كفار'], ['شرك', 'مشرك', 'إشراك', 'مشركين'], ['نفاق', 'منافق', 'منافقين'], ['كبيرة', 'كبائر'], ['صغيرة', 'صغائر'], ['تأويل', 'مؤول', 'يؤول'], ['تفويض', 'مفوض', 'يفوض'], ['تنزيه', 'منزه', 'ينزه'], ['تشبيه', 'مشبه', 'تشبيهات'],
  // tasawuf dan akhlak
  ['إخلاص', 'مخلص', 'أخلص', 'خالص'], ['رياء', 'مراءاة', 'يرائي', 'مرائي'], ['عجب', 'إعجاب', 'معجب'], ['كبر', 'تكبر', 'متكبر', 'كبرياء'], ['تواضع', 'متواضع', 'يتواضع'], ['حسد', 'حاسد', 'محسود', 'يحسد'],
  ['غيبة', 'اغتياب', 'يغتاب'], ['نميمة', 'نمام', 'نمام'], ['زهد', 'زاهد', 'يزهد'], ['ورع', 'تورع', 'متورع'], ['قناعة', 'قانع', 'قنع'], ['توكل', 'متوكل', 'يتوكل', 'وكل'], ['رضا', 'راض', 'رضي'],
  ['خوف', 'خشية', 'خائف', 'يخاف'], ['رجاء', 'أمل', 'راج', 'يرجو'], ['محبة', 'حب', 'عشق', 'محب'], ['معرفة', 'عارف', 'عرف', 'عرفان'], ['مقام', 'مقامات'], ['مراقبة', 'رقيب', 'يراقب'], ['حساب', 'محاسبة', 'يحاسب'],
  ['ذكر', 'أذكار', 'ذاكر', 'تذكر'], ['ورد', 'أوراد', 'وظيفة'], ['مرشد', 'مشايخ', 'شيخ'], ['سالك', 'سلوك', 'يسلك'], ['صدق', 'صادق', 'صادقين', 'صديق'], ['حياء', 'حيي', 'استحياء'], ['حلم', 'حليم', 'يحلم'],
  ['رفق', 'رفيق', 'لين', 'ليونة'], ['سخاء', 'سخي', 'جود', 'كرم', 'جواد'], ['بخل', 'بخيل', 'شح', 'شحيح'], ['أمانة', 'أمين', 'أمنا'], ['كذب', 'كاذب', 'أكذب'], ['غضب', 'غاضب', 'يغضب'], ['عفو', 'عفا', 'يعفو'],
  ['أدب', 'آداب', 'تأدب'], ['تعلم', 'متعلم', 'يتعلم'], ['تعليم', 'معلم', 'مدرس', 'يعلم'], ['والد', 'والدين', 'أبوين'], ['رحم', 'أرحام'], ['جار', 'جيران', 'جوار'], ['ضيف', 'ضيافة', 'أضياف'], ['دعاء', 'دعا', 'يدعو', 'أدعية'], ['خشوع', 'خاشع', 'يخشع'],
  // ushul dan qawaid
  ['أمر', 'أوامر', 'آمر'], ['نهي', 'نواهي', 'ينهى'], ['عام', 'عموم', 'عمومات'], ['خاص', 'خصوص', 'تخصيص', 'مخصص'], ['مطلق', 'إطلاق'], ['مقيد', 'تقييد', 'قيد'], ['مجمل', 'إجمال'], ['مبين', 'بيان', 'تبيين'],
  ['ظاهر', 'ظهور'], ['نص', 'نصوص'], ['منطوق', 'نطق'], ['مفهوم', 'فحوى'], ['قياس', 'مقيس', 'يقاس', 'أقيسة'], ['علة', 'علل', 'معلول', 'معلل'], ['إجماع', 'أجمع', 'مجمعون', 'اتفاق'], ['اجتهاد', 'مجتهد', 'يجتهد'],
  ['تقليد', 'مقلد', 'يقلد'], ['فتوى', 'فتاوى', 'مفتي', 'أفتى'], ['نسخ', 'ناسخ', 'منسوخ'], ['تعارض', 'معارض', 'يعارض'], ['ترجيح', 'راجح', 'مرجوح', 'يرجح'], ['استحسان', 'يستحسن'], ['مصلحة', 'مصالح', 'استصلاح'],
  ['ذريعة', 'ذرائع'], ['عرف', 'عادة', 'معروف', 'أعراف'], ['سبب', 'أسباب', 'مسبب'], ['مانع', 'موانع', 'يمنع'], ['عزيمة', 'عزائم'], ['مجاز', 'مجازي', 'مجازات'], ['مكلف', 'تكليف', 'مكلفين', 'يكلف'], ['أهلية', 'أهل', 'أهليات'],
  ['مقصد', 'مقاصد'], ['قاعدة', 'قواعد'], ['ضرر', 'ضرار', 'مضرة'], ['مشقة', 'مشاق', 'عسر'], ['يقين', 'متيقن', 'يتيقن'], ['شك', 'مشكوك', 'يشك'], ['ضرورة', 'ضرورات', 'اضطرار', 'مضطر'], ['مفسدة', 'مفاسد'],
  // balaghah
  ['بلاغة', 'بليغ', 'بلغاء', 'أبلغ'], ['فصاحة', 'فصيح', 'فصحاء'], ['تشبيه', 'تشبيهات', 'شبه'], ['استعارة', 'مستعار', 'استعارات', 'يستعير'], ['كناية', 'كنى', 'يكني'], ['حذف', 'محذوف', 'يحذف'],
  ['تقديم', 'يقدم', 'مقدم'], ['تأخير', 'يؤخر', 'مؤخر'], ['قصر', 'حصر', 'اختصاص', 'مقصور'], ['إيجاز', 'موجز', 'وجيز'], ['إطناب', 'مطنب', 'بسط'], ['إنشاء', 'إنشائي', 'أنشأ'], ['استفهام', 'استفهامية', 'يستفهم'],
  ['نداء', 'منادى', 'ينادي'], ['جناس', 'تجنيس', 'يجانس'], ['طباق', 'مطابقة', 'تضاد', 'مقابلة'], ['سجع', 'أسجاع', 'مسجوع'], ['التفات', 'يلتفت', 'ملتفت'],
  // nahwu dan sharaf
  ['رفع', 'مرفوع', 'يرفع', 'ارتفاع'], ['نصب', 'منصوب', 'ينصب', 'انتصاب'], ['جر', 'مجرور', 'يجر', 'خفض', 'مخفوض'], ['جزم', 'مجزوم', 'يجزم'], ['ضمة', 'مضموم', 'ضم'], ['فتحة', 'مفتوح', 'فتح'], ['كسرة', 'مكسور', 'كسر'],
  ['سكون', 'ساكن', 'يسكن'], ['فاعل', 'فاعلية'], ['مفعول', 'مفعولية'], ['مبتدأ', 'ابتداء'], ['نعت', 'منعوت', 'نعوت'], ['عطف', 'معطوف', 'عاطف'], ['توكيد', 'تأكيد', 'مؤكد'], ['بدل', 'مبدل', 'بدلية'],
  ['تمييز', 'مميز'], ['استثناء', 'مستثنى', 'يستثنى'], ['ظرف', 'ظروف', 'مظروف'], ['جواب', 'أجوبة', 'يجيب'], ['اسم', 'أسماء', 'مسمى'], ['فعل', 'أفعال', 'فعلي'], ['حرف', 'حروف', 'حرفي'], ['ضمير', 'ضمائر', 'مضمر'],
  ['موصول', 'موصولة'], ['مثنى', 'تثنية', 'يثنى'], ['مذكر', 'تذكير'], ['مؤنث', 'تأنيث', 'مؤنثة'], ['عامل', 'معمول', 'يعمل'], ['وزن', 'أوزان', 'موزون'], ['مصدر', 'مصادر', 'مصدري'], ['مشتق', 'اشتقاق', 'مشتقات'],
  ['جامد', 'جوامد'], ['معتل', 'إعلال'], ['مهموز', 'همز', 'همزة'], ['مضعف', 'تضعيف', 'مضاعف'], ['إدغام', 'مدغم', 'يدغم'], ['تصريف', 'يصرف', 'متصرف'], ['لازم', 'لزوم'], ['متعد', 'تعدية', 'يتعدى'],
  // tafsir, ulumul quran, tajwid
  ['تفسير', 'مفسر', 'يفسر', 'تفاسير'], ['آية', 'آيات'], ['سورة', 'سور'], ['نزول', 'نزلت', 'أنزل', 'نزل', 'تنزيل'], ['مكي', 'مكية', 'مكيات'], ['مدني', 'مدنية', 'مدنيات'], ['محكم', 'إحكام', 'محكمات'],
  ['متشابه', 'تشابه', 'متشابهات', 'مشتبه'], ['قراءة', 'قراءات', 'قارئ', 'يقرأ', 'قرأ', 'قراء'], ['مصحف', 'مصاحف'], ['تلاوة', 'تال', 'يتلو', 'تلا'], ['ترتيل', 'رتل', 'يرتل'], ['تجويد', 'مجود', 'يجود'],
  ['مخرج', 'مخارج'], ['إظهار', 'مظهر', 'يظهر'], ['إخفاء', 'مخفي', 'يخفي', 'خفاء'], ['إقلاب', 'مقلوب'], ['مد', 'ممدود', 'يمد', 'مدود'], ['غنة', 'غنن'], ['ترقيق', 'مرقق', 'يرقق'], ['تفخيم', 'مفخم', 'يفخم'],
  // mustalah dan hadits
  ['موضوع', 'وضع', 'وضاع', 'وضاعون'], ['متواتر', 'تواتر', 'تواترا'], ['مشهور', 'شهرة', 'استفاضة'], ['غريب', 'غرابة', 'تفرد', 'فرد'], ['مرسل', 'إرسال', 'مراسيل', 'يرسل'], ['منقطع', 'انقطاع', 'سقط'],
  ['معضل', 'إعضال'], ['معلق', 'تعليق'], ['مدلس', 'تدليس', 'دلس'], ['شاذ', 'شذوذ', 'شواذ'], ['منكر', 'نكارة', 'أنكر'], ['مدرج', 'إدراج', 'أدرج'], ['مضطرب', 'اضطراب', 'يضطرب'], ['جرح', 'مجروح', 'يجرح', 'جارح'],
  ['تعديل', 'عدالة', 'عدل', 'معدل'], ['ضبط', 'ضابط', 'مضبوط'], ['ثقة', 'ثقات', 'موثق', 'توثيق'], ['سند', 'أسانيد', 'إسناد', 'مسند', 'مسندا'], ['متن', 'متون'], ['راو', 'راوي', 'رواة'], ['صحابي', 'صحابة', 'صحب', 'صحبة', 'أصحاب'],
  ['تابعي', 'تابعين', 'تابع'], ['متابعة', 'متابع'], ['شاهد', 'شواهد'], ['تخريج', 'أخرج', 'مخرج'],
  // sirah dan mantiq
  ['هجرة', 'هاجر', 'مهاجر', 'مهاجرين'], ['غزوة', 'غزوات', 'غزا', 'سرية', 'سرايا'], ['خلافة', 'خليفة', 'خلفاء'], ['بيعة', 'بايع', 'مبايعة', 'يبايع'], ['مولد', 'ولد', 'ولادة', 'مولود'], ['وفاة', 'توفي', 'مات', 'موت'],
  ['تصور', 'تصورات', 'متصور'], ['كلي', 'كليات', 'كلية'], ['جزئي', 'جزئيات', 'جزئية'], ['قضية', 'قضايا'], ['موجبة', 'إيجاب', 'موجب'], ['سالبة', 'سلب', 'سالب'],
];
