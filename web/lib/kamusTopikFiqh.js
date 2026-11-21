// Kamus TOPIK FIQIH untuk pencarian halaman Tanya Kitab (data murni, tanpa AI). Dibaca oleh web/lib/kamusTopik.js.
//
// FORMAT satu baris:  fan | sebutan Indonesia; sebutan lain | istilah Arab di kitab; istilah lain | kata isi khas
//   - sebutan Indonesia : cara orang bertanya (boleh variasi ejaan: wudhu/wudu, shalat/sholat/salat). Dicocokkan dengan pertanyaan.
//   - istilah Arab      : nama topik sebagaimana tertulis di kitab (tanpa harakat). Yang pertama dijadikan kueri utama.
//   - kata isi khas     : kata yang biasanya ADA di halaman yang menjawab (nama hal yang dihitung, tingkatan, unsur hukum).
//                         Dua kata pertama dipakai sebagai kueri pasangan, jadi urutkan dari yang paling khas.
// Baris kosong dan baris berawalan # diabaikan. Jangan memakai tanda | atau ; di dalam isian.
// Isi kamus hanya NAMA dan KATA KUNCI pencarian. Bukan isi hukum, bukan jawaban, dan tidak pernah dikutip sebagai sumber.

export const FIQH_TEKS = `
# ---------- THAHARAH ----------
fiqh_ibadah|wudhu; wudu; berwudhu; fardhu wudhu|الوضوء; وضوء; توضأ; يتوضأ|فروض; سنن; نواقض; نية; مسح
fiqh_ibadah|batal wudhu; pembatal wudhu; yang membatalkan wudhu; hal yang membatalkan wudhu|نواقض الوضوء; ما ينقض الوضوء; أسباب الحدث|سبيلين; نوم; لمس; زوال; مس
fiqh_ibadah|mandi besar; mandi junub; mandi wajib; ghusl; janabah; junub|الغسل; غسل الجنابة; الجنابة; موجبات الغسل|موجبات; نية; تعميم; جنب; حدث
fiqh_ibadah|tayammum; tayamum|التيمم; تيمم; يتيمم|تراب; صعيد; ضربتين; عدم الماء; نية
fiqh_ibadah|najis; benda najis; menyucikan najis; najis anjing; najis babi; najis mughallazhah; najis mukhaffafah|النجاسة; النجس; النجاسات; إزالة النجاسة|مغلظة; مخففة; متوسطة; عينية; حكمية
fiqh_ibadah|air suci; air mutlak; air musta'mal; air dua kullah; air banyak; air mutanajjis|الماء المطلق; الماء الطهور; القلتين; الماء المستعمل|طهور; قلتين; مستعمل; تغير; مطلق
fiqh_ibadah|haid; menstruasi; darah haid; wanita haid|الحيض; حيض; أحكام الحيض|أقل; أكثر; دم; عادة; طهر
fiqh_ibadah|nifas; darah nifas; setelah melahirkan|النفاس; نفاس; أحكام النفاس|ستين; ولادة; دم; أقله
fiqh_ibadah|istihadhah; darah penyakit; darah istihadhah|الاستحاضة; استحاضة; المستحاضة|تمييز; عادة; دم; عصابة
fiqh_ibadah|istinja; istinjak; cebok; buang air besar; buang air kecil; adab buang hajat; qadha hajat|الاستنجاء; الاستجمار; قضاء الحاجة|حجر; ماء; ثلاثة; بول; غائط
fiqh_ibadah|mengusap khuf; mengusap sepatu; mengusap kaos kaki; masah khuf|المسح على الخفين; مسح الخف; الخف|يوم وليلة; ثلاثة أيام; لبس; مقيم; مسافر
fiqh_ibadah|siwak; bersiwak; gosok gigi|السواك; سواك; يستاك|أراك; فم; تغير; سنة
fiqh_ibadah|bejana; wadah emas perak; bejana emas|الآنية; آنية الذهب والفضة|ذهب; فضة; استعمال; اتخاذ
# ---------- SHALAT ----------
fiqh_ibadah|syarat sah shalat; syarat shalat; syarat sholat; menutup aurat|شروط الصلاة; شروط صحة الصلاة; ستر العورة; استقبال القبلة|طهارة; وقت; قبلة; عورة; علم
fiqh_ibadah|rukun shalat; fardhu shalat; rukun sholat; rukun salat|أركان الصلاة; فروض الصلاة|نية; تكبيرة; فاتحة; ركوع; طمأنينة; تشهد
fiqh_ibadah|sunnah shalat; sunnah ab'ad; sunnah hai'at; sunnah ab'adh shalat|سنن الصلاة; الأبعاض; الهيئات|أبعاض; هيئات; تشهد أول; قنوت; صلاة على النبي
fiqh_ibadah|pembatal shalat; batal shalat; yang membatalkan shalat; hal yang membatalkan sholat|مبطلات الصلاة; ما يبطل الصلاة|كلام; فعل كثير; أكل; حدث; ثلاث
fiqh_ibadah|sujud sahwi; sujud lupa; lupa dalam shalat; lupa tahiyat awal; lupa rakaat|سجود السهو; السهو في الصلاة|أبعاض; تشهد أول; قنوت; سلام; شك
fiqh_ibadah|sujud tilawah; sujud syukur; ayat sajdah|سجود التلاوة; سجدة التلاوة; سجود الشكر|آية; قارئ; مستمع; تكبيرة
fiqh_ibadah|shalat jamak; jamak; qashar; shalat musafir; shalat safar; jamak qashar; shalat dalam perjalanan|الجمع بين الصلاتين; القصر; قصر الصلاة; صلاة المسافر|مسافة; مرحلتين; سفر; تقديم; تأخير
fiqh_ibadah|shalat jumat; sholat jumat; khutbah jumat; shalat jum'at; syarat jumat|صلاة الجمعة; الجمعة; خطبة الجمعة|أربعين; خطبتين; مصر; جماعة; أركان الخطبة
fiqh_ibadah|shalat berjamaah; jamaah; imam; makmum; masbuq; mengikuti imam; syarat imam|صلاة الجماعة; الجماعة; الإمامة; الاقتداء; المسبوق|إمام; مأموم; متابعة; موافقة; تقدم
fiqh_ibadah|shalat jenazah; menyalatkan jenazah; salat mayit|صلاة الجنازة; الصلاة على الميت|تكبيرات; أربع; غائب; ميت; دعاء
fiqh_ibadah|memandikan jenazah; mengkafani; mengafani; menguburkan jenazah; kafan; tajhiz jenazah; mengurus jenazah|تجهيز الميت; غسل الميت; تكفين الميت; دفن الميت|كفن; لفائف; لحد; قبر; غسل
fiqh_ibadah|adzan; azan; iqamah; qamat|الأذان; الإقامة; أذان|مؤذن; ترجيع; حيعلة; وقت; تثويب
fiqh_ibadah|waktu shalat; awal waktu; akhir waktu; waktu dzuhur; waktu ashar; waktu maghrib; waktu isya; waktu subuh|مواقيت الصلاة; أوقات الصلاة; وقت الصلاة|زوال; غروب; شفق; فجر; ظل
fiqh_ibadah|qadha shalat; shalat qadha; shalat yang tertinggal; meninggalkan shalat; shalat fa'itah|قضاء الصلاة; الفائتة; تارك الصلاة|فوات; نسيان; فورا; ترتيب; عذر
fiqh_ibadah|aurat; aurat laki-laki; aurat perempuan; batas aurat|العورة; عورة المرأة; عورة الرجل|سرة; ركبة; وجه; كفين; أمة
fiqh_ibadah|kiblat; arah kiblat; menghadap kiblat|القبلة; استقبال القبلة; الكعبة|عين; جهة; اجتهاد; مشاهد
fiqh_ibadah|shalat tarawih; qiyam ramadhan; tarawih|صلاة التراويح; التراويح; قيام رمضان|عشرين; ركعتين; جماعة; تسليمة
fiqh_ibadah|shalat witir; witir|صلاة الوتر; الوتر|ركعة; ثلاث; قنوت; عشاء; أقله
fiqh_ibadah|shalat id; shalat hari raya; shalat idul fitri; shalat idul adha; takbiran|صلاة العيدين; صلاة العيد; التكبير|تكبيرات; زوائد; خطبتين; فطر; أضحى
fiqh_ibadah|shalat gerhana; shalat kusuf; shalat khusuf; gerhana|صلاة الكسوف; الكسوف; الخسوف|ركوعين; كسوف; خسوف; خطبتين
fiqh_ibadah|shalat istisqa; shalat minta hujan|صلاة الاستسقاء; الاستسقاء|مطر; قحط; خروج; رداء
fiqh_ibadah|shalat dhuha; dhuha; duha|صلاة الضحى; الضحى|ركعتين; ثمان; ارتفاع; شمس
fiqh_ibadah|shalat tahajud; tahajjud; qiyamul lail; shalat malam|صلاة التهجد; التهجد; قيام الليل|نوم; ليل; وتر; ركعتين
fiqh_ibadah|shalat rawatib; sunnah rawatib; qabliyah; ba'diyah; shalat sunnah muakkad|السنن الرواتب; الراتبة; الرواتب|قبلية; بعدية; مؤكدة; ركعتين; فجر
fiqh_ibadah|shalat tahiyatul masjid; shalat sunnah mutlak; shalat istikharah; shalat hajat; shalat awwabin|تحية المسجد; صلاة الاستخارة; صلاة الحاجة; النفل المطلق|استخارة; حاجة; تحية; نفل
fiqh_ibadah|shalat khauf; shalat dalam peperangan; shalat saat perang|صلاة الخوف; الخوف|عدو; فرقتين; ذات الرقاع; قتال
fiqh_ibadah|shalat orang sakit; shalat sambil duduk; shalat sambil berbaring; shalat tidak mampu berdiri|صلاة المريض; صلاة القاعد; العجز عن القيام|قيام; قعود; اضطجاع; إيماء; مستلقيا
fiqh_ibadah|sutrah; lewat di depan orang shalat; orang lewat di depan musholli|السترة; المرور بين يدي المصلي|مصلي; مار; دفع; خط
# ---------- ZAKAT ----------
fiqh_ibadah|zakat sapi; zakat kerbau; zakat ternak sapi; nisab sapi; zakat lembu|زكاة البقر; زكاة النعم; نصاب البقر; البقر; بقرة|تبيع; مسنة; ثلاثين; أربعين; سائمة
fiqh_ibadah|zakat kambing; zakat domba; zakat ternak kambing; zakat biri-biri|زكاة الغنم; زكاة النعم; الغنم; الشاة|شاة; جذعة; ثنية; أربعين; مائة وعشرين
fiqh_ibadah|zakat unta; nisab unta|زكاة الإبل; نصاب الإبل; الإبل|بنت مخاض; بنت لبون; حقة; جذعة; خمس
fiqh_ibadah|zakat ternak; zakat hewan ternak; zakat binatang ternak; zakat an'am; zakat pengembalaan|زكاة النعم; زكاة الأنعام; زكاة الحيوان; زكاة بهيمة الأنعام|سائمة; نصاب; حول; إبل; بقر; غنم
fiqh_ibadah|zakat emas; zakat perak; zakat uang; zakat simpanan; nisab emas; zakat tabungan|زكاة النقدين; زكاة الذهب والفضة; نصاب الذهب|ذهب; فضة; مثقال; درهم; ربع العشر
fiqh_ibadah|zakat pertanian; zakat padi; zakat hasil bumi; zakat kurma; zakat gandum; zakat biji-bijian; zakat hasil panen|زكاة الزروع والثمار; زكاة الزرع; زكاة الثمار; زكاة المعشرات|وسق; أوسق; العشر; نصف العشر; تمر; حب
fiqh_ibadah|zakat perdagangan; zakat dagang; zakat bisnis; zakat usaha; zakat barang dagangan|زكاة التجارة; زكاة عروض التجارة; العروض|عروض; قيمة; حول; نية التجارة; تقويم
fiqh_ibadah|zakat fitrah; zakat fitri; zakat idul fitri; fitrah|زكاة الفطر; صدقة الفطر; زكاة الفطرة|صاع; رمضان; قوت; غروب; عيد
fiqh_ibadah|zakat rikaz; harta temuan; zakat barang tambang; zakat ma'din; harta karun; zakat emas tambang|الركاز; زكاة المعدن; زكاة الركاز|معدن; خمس; دفين; جاهلية; نيل
fiqh_ibadah|penerima zakat; mustahiq; mustahik; asnaf; delapan golongan zakat; golongan penerima zakat; fakir miskin|مصارف الزكاة; الأصناف الثمانية; مستحقو الزكاة|فقير; مسكين; عامل; مؤلفة; رقاب; غارم; سبيل الله; ابن السبيل
fiqh_ibadah|syarat wajib zakat; haul; kepemilikan penuh; sa'imah; ternak digembalakan; zakat wajib atas siapa|شروط وجوب الزكاة; الحول; السوم|إسلام; ملك تام; نصاب; سائمة; حرية
fiqh_ibadah|mengeluarkan zakat; niat zakat; menyegerakan zakat; ta'jil zakat; zakat sebelum haul|إخراج الزكاة; نية الزكاة; تعجيل الزكاة|نية; تعجيل; تأخير; فور; مستحق
# ---------- PUASA ----------
fiqh_ibadah|rukun puasa; syarat puasa; niat puasa; puasa ramadhan; syarat sah puasa|أركان الصوم; شروط الصوم; نية الصوم; صوم رمضان|نية; إمساك; تبييت; فجر; غروب
fiqh_ibadah|pembatal puasa; yang membatalkan puasa; batal puasa; makan minum saat puasa; hal yang membatalkan puasa|مفطرات الصوم; ما يفطر الصائم; مبطلات الصوم|جماع; استقاء; عين; جوف; استمناء
fiqh_ibadah|qadha puasa; mengganti puasa; utang puasa; puasa qadha; qadha ramadhan|قضاء الصوم; قضاء رمضان; من أفطر|فوات; أيام أخر; تأخير; فدية; تتابع
fiqh_ibadah|fidyah; fidyah puasa; tidak mampu puasa; ibu hamil puasa; ibu menyusui puasa; orang tua renta puasa|الفدية; فدية الصوم; الإطعام|مد; شيخ كبير; مرضع; حامل; عجز
fiqh_ibadah|kafarat puasa; kafarat jima siang ramadhan; kaffarah puasa; hubungan suami istri siang hari ramadhan|كفارة الجماع في رمضان; كفارة الصوم; كفارة الإفطار|عتق رقبة; شهرين متتابعين; ستين مسكينا; جماع; رقبة
fiqh_ibadah|puasa sunnah; puasa senin kamis; puasa arafah; puasa asyura; puasa syawal; puasa ayyamul bidh; puasa daud|صوم التطوع; صيام النفل; صوم عرفة; عاشوراء; الأيام البيض; ستة من شوال|عرفة; تاسوعاء; شوال; اثنين; خميس
fiqh_ibadah|puasa haram; puasa yang dilarang; hari tasyrik; puasa hari raya; puasa hari syak|الصوم المنهي عنه; أيام التشريق; يوم الشك|عيدين; تشريق; شك; نهي; جمعة
fiqh_ibadah|itikaf; i'tikaf|الاعتكاف; اعتكاف; المعتكف|مسجد; نية; لبث; ليلة القدر; خروج
fiqh_ibadah|rukyat hilal; penentuan awal ramadhan; hisab; hilal; sidang isbat|رؤية الهلال; ثبوت رمضان; الهلال|رؤية; شهادة; عدل; إكمال; شعبان
fiqh_ibadah|lailatul qadar; malam lailatul qadar; malam seribu bulan|ليلة القدر; القدر|العشر الأواخر; وتر; رمضان; ألف شهر
fiqh_ibadah|puasa orang sakit; puasa musafir; puasa wanita hamil; udzur puasa; rukhshah puasa|رخصة الفطر; أعذار الصوم; الفطر في السفر|مرض; سفر; مشقة; حمل; رضاع
# ---------- HAJI, UMRAH, KURBAN ----------
fiqh_ibadah|rukun haji; haji; ibadah haji; tata cara haji|أركان الحج; الحج; مناسك الحج|إحرام; وقوف; طواف; سعي; حلق
fiqh_ibadah|rukun umrah; umrah; umroh; tata cara umrah|أركان العمرة; العمرة|إحرام; طواف; سعي; حلق; ميقات
fiqh_ibadah|ihram; niat ihram; larangan ihram; miqat; pakaian ihram; muharramat ihram|الإحرام; محظورات الإحرام; المواقيت|ميقات; مخيط; طيب; صيد; تحلل
fiqh_ibadah|thawaf; tawaf; thawaf ifadhah; thawaf wada; thawaf qudum; syarat thawaf|الطواف; طواف الإفاضة; طواف الوداع; طواف القدوم|سبعة; حجر; كعبة; شروط; ركن
fiqh_ibadah|sai; sa'i; sai safa marwa; safa dan marwah|السعي; سعي; الصفا والمروة|سبعة; صفا; مروة; بدء; ختم
fiqh_ibadah|wukuf; wukuf arafah; wukuf di arafah|الوقوف بعرفة; وقوف; عرفة|تاسع; ذي الحجة; ليلة النحر; عرفات; زوال
fiqh_ibadah|mabit; mabit di muzdalifah; mabit di mina; melempar jumrah; jumrah; lempar jumrah|المبيت بمزدلفة; المبيت بمنى; رمي الجمرات; الجمرة|حصى; عقبة; أيام التشريق; سبع; مزدلفة
fiqh_ibadah|dam haji; denda haji; fidyah haji; dam tamattu; dam; dam umrah|الدم; دم التمتع; فدية الأذى; الجزاء|تمتع; قران; إفراد; شاة; ذبح
fiqh_ibadah|tahallul; bercukur haji; potong rambut haji; tahallul awal; tahallul tsani|التحلل; الحلق; التقصير|حلق; تقصير; أول; ثاني; ثلاث شعرات
fiqh_ibadah|haji tamattu; haji qiran; haji ifrad; macam haji; jenis haji|التمتع; القران; الإفراد; أنواع النسك|نسك; عمرة; حج; هدي; دم
fiqh_ibadah|syarat wajib haji; istitha'ah; kemampuan haji; syarat haji; haji wajib|شروط وجوب الحج; الاستطاعة|زاد; راحلة; أمن الطريق; بلوغ; عقل
fiqh_ibadah|kurban; qurban; udhiyah; hewan kurban; syarat hewan kurban; berkurban|الأضحية; أضحية; الأضاحي|جذع; ثني; سن; سلامة; عيب; أيام التشريق
fiqh_ibadah|aqiqah; akikah; aqiqah anak|العقيقة; عقيقة|سابع; مولود; شاتان; ذكر; تسمية
fiqh_ibadah|penyembelihan; sembelih; menyembelih hewan; syarat penyembelih; hewan sembelihan; dzabihah|الذبح; الذبائح; الذكاة; ذكاة|حلقوم; مريء; سكين; بسملة; قطع
fiqh_ibadah|berburu; hewan buruan; anjing pemburu; hasil buruan|الصيد; الصيد والذبائح; صيد|جارحة; معلم; سهم; إرسال; كلب
fiqh_ibadah|makanan halal; makanan haram; hewan halal; hewan haram; bangkai; makanan yang diharamkan|الأطعمة; ما يحل أكله; ما يحرم أكله|ميتة; مستخبث; سباع; ضرورة; مستطاب
fiqh_ibadah|nazar; nadzar; sumpah; yamin; kafarat sumpah; kaffarat yamin|النذر; نذر; اليمين; الأيمان; كفارة اليمين|كفارة; إطعام عشرة مساكين; حنث; لغو; حلف
fiqh_ibadah|talqin; ziarah kubur; orang yang meninggal; adab menziarahi kubur; ta'ziyah; takziyah|التلقين; زيارة القبور; التعزية|احتضار; دفن; تعزية; قبر; ميت
# ---------- MUAMALAT ----------
fiqh_muamalat|jual beli; rukun jual beli; syarat jual beli; akad jual beli; hukum jual beli|البيع; أركان البيع; شروط البيع|عاقد; معقود عليه; صيغة; إيجاب; قبول
fiqh_muamalat|jual beli terlarang; jual beli yang dilarang; gharar; bai najasy; jual beli sebelum diterima; jual beli yang batal|البيوع المنهي عنها; الغرر; البيع الفاسد|نهي; غرر; جهالة; قبض; نجش
fiqh_muamalat|riba; bunga bank; riba fadhl; riba nasi'ah; riba yad; barang ribawi; hukum riba|الربا; ربا الفضل; ربا النسيئة; ربا اليد; الأموال الربوية|ذهب; فضة; بر; شعير; تمر; ملح; تماثل; تقابض
fiqh_muamalat|khiyar; khiyar majlis; khiyar syarat; khiyar aib; hak pilih jual beli; hak memilih dalam jual beli|الخيار; خيار المجلس; خيار الشرط; خيار العيب|مجلس; تفرق; عيب; رد; ثلاثة أيام
fiqh_muamalat|jual beli salam; pesan barang; salam; akad salam; pemesanan barang|السلم; السلف; بيع السلم|مسلم فيه; رأس المال; أجل; صفة; مجلس
fiqh_muamalat|murabahah; jual beli dengan keuntungan; bai murabahah; jual beli amanah|المرابحة; بيع المرابحة; بيوع الأمانة|ثمن; ربح; رأس المال; تولية; إشراك
fiqh_muamalat|sewa; ijarah; sewa menyewa; upah; ujrah; akad sewa; menyewakan|الإجارة; إجارة; الأجرة; الأجير|منفعة; مدة; أجر; عمل; مؤجر; مستأجر
fiqh_muamalat|gadai; rahn; barang gadai|الرهن; رهن; المرهون|مرهون; راهن; مرتهن; قبض; دين
fiqh_muamalat|hutang; utang; qardh; pinjaman uang; pinjam meminjam; piutang; utang piutang|القرض; قرض; الدين; الاقتراض|مثل; رد; منفعة; أجل; جر نفعا
fiqh_muamalat|pinjam barang; ariyah; i'arah; meminjamkan barang|العارية; عارية; الإعارة|منفعة; ضمان; مستعير; معير; رد
fiqh_muamalat|titipan; wadi'ah; barang titipan; menitipkan barang|الوديعة; وديعة; الإيداع|أمانة; حفظ; ضمان; مودع; تعدي
fiqh_muamalat|ghasab; merampas; mengambil tanpa izin; barang rampasan; barang ghasaban|الغصب; غصب|غاصب; ضمان; رد; مغصوب; أرش
fiqh_muamalat|wakalah; perwakilan; mewakilkan; wakil; akad wakalah|الوكالة; وكالة; التوكيل|موكل; وكيل; تصرف; عزل; أجر
fiqh_muamalat|kafalah; penjaminan; dhaman; jaminan utang; menjamin|الكفالة; الضمان; كفالة|ضامن; مضمون له; دين; بدن; مضمون عنه
fiqh_muamalat|hawalah; pemindahan utang; mengalihkan utang|الحوالة; حوالة|محيل; محتال; محال عليه; دين; رضا
fiqh_muamalat|syirkah; kongsi; persekutuan; usaha bersama; perseroan|الشركة; شركة; شركة العنان|مال; ربح; خسارة; خلط; شريك
fiqh_muamalat|mudharabah; qiradh; bagi hasil; modal usaha; qirad|القراض; المضاربة; قراض|عامل; مالك; ربح; رأس المال; حصة
fiqh_muamalat|musaqah; muzara'ah; bagi hasil kebun; mukhabarah; bagi hasil sawah; garap tanah|المساقاة; المزارعة; المخابرة|نخل; عنب; شجر; أرض; ثمر
fiqh_muamalat|ihya mawat; membuka lahan; tanah mati; menghidupkan tanah mati|إحياء الموات; الموات|عمارة; إذن; أرض; إمام; ملك
fiqh_muamalat|syuf'ah; hak membeli lebih dahulu; hak syuf'ah; hak preemptif|الشفعة; شفعة|شفيع; شريك; عقار; جوار; ثمن
fiqh_muamalat|wakaf; waqaf; wakaf tanah; nazhir; wakaf produktif; syarat wakaf|الوقف; وقف; الوقف والتحبيس|موقوف; واقف; ناظر; موقوف عليه; تأبيد
fiqh_muamalat|hibah; pemberian; hadiah; sedekah; shadaqah; menarik kembali hibah|الهبة; هبة; الهدية; الصدقة|رجوع; والد; قبض; عمرى; رقبى
fiqh_muamalat|wasiat; wasiyat; berwasiat; wasiat sepertiga; wasiat untuk ahli waris|الوصية; وصية; الوصايا|ثلث; موصي; موصى له; وارث; إجازة
fiqh_muamalat|barang temuan; luqathah; menemukan barang hilang; anak temuan; laqith; barang hilang|اللقطة; لقطة; اللقيط|تعريف; سنة; ملك; حول; ملتقط
fiqh_muamalat|perdamaian; shulh; damai dalam sengketa; islah dalam sengketa|الصلح; صلح|إقرار; إنكار; عوض; براءة; صلح
fiqh_muamalat|pailit; iflas; muflis; pencekalan harta; tafliis; orang bangkrut|التفليس; الإفلاس; المفلس|مفلس; حجر; غرماء; دين; قسمة
fiqh_muamalat|hajr; pengampuan; orang yang dilarang bertransaksi; safih; anak kecil dalam akad; orang kurang akal|الحجر; المحجور عليه; السفيه|صبي; مجنون; سفه; ولي; رشد
fiqh_muamalat|sayembara; ju'alah; upah menemukan; hadiah menemukan|الجعالة; جعالة|جعل; عامل; رد; آبق; مجهول
fiqh_muamalat|lomba; musabaqah; perlombaan; panahan; pacuan; hadiah lomba|المسابقة; مسابقة; السبق والرمي|سبق; رمي; عوض; محلل; خيل
# ---------- MUNAKAHAT ----------
munakahat|nikah; rukun nikah; syarat nikah; akad nikah; hukum nikah; pernikahan|النكاح; أركان النكاح; شروط النكاح|زوج; زوجة; ولي; شاهدان; صيغة
munakahat|wali nikah; wali mujbir; wali hakim; wali nasab; urutan wali; wali aqrab; wali ab'ad|الولي; ولي النكاح; الولاية; ولي مجبر|عاصب; أب; جد; أخ; سلطان; عضل
munakahat|saksi nikah; dua saksi nikah; syarat saksi nikah|شاهدا عدل; الشهود في النكاح; شاهدين|عدالة; حضور; ذكر; سماع; بلوغ
munakahat|mahar; maskawin; mas kawin; mahar mitsil; mahar musamma; hukum mahar|المهر; مهر; الصداق; مهر المثل|تسمية; دخول; تشطر; مفوضة; نصف
munakahat|khitbah; meminang; melamar; pinangan; lamaran; melihat calon istri|الخطبة; خطبة; الخطبة على الخطبة|مخطوبة; نظر; إجابة; تصريح; تعريض
munakahat|wanita yang haram dinikahi; mahram; mahram nikah; muhrim; perempuan yang haram dinikahi; muharramat|المحرمات من النساء; المحرمات; المحارم|نسب; رضاع; مصاهرة; جمع; أم; بنت; أخت
munakahat|poligami; beristri lebih dari satu; empat istri; adil antar istri; hak bergilir|التعدد; تعدد الزوجات; القسم|أربع; عدل; قسم; ضرة; زوجات
munakahat|nafkah; nafkah istri; nafkah keluarga; nafkah anak; nafkah kerabat|النفقة; نفقة الزوجة; نفقة الأقارب|كسوة; سكنى; إعسار; تمكين; مد
munakahat|talak; cerai; perceraian; talak tiga; talak raj'i; talak bain; talak sunni; talak bid'i; menceraikan istri|الطلاق; الطلاق البدعي; الطلاق السني; الطلاق الرجعي; البائن|ثلاث; رجعي; بائن; صريح; كناية; تعليق
munakahat|khulu; khuluk; tebusan cerai; gugat cerai; cerai gugat; khulu'|الخلع; خلع|عوض; افتداء; بائن; كراهة; بذل
munakahat|rujuk; ruju'; kembali kepada istri; merujuk istri|الرجعة; رجعة; الارتجاع|رجعية; عدة; صيغة; إشهاد; محلل
munakahat|iddah; masa iddah; iddah wafat; iddah talak; masa tunggu; iddah istri|العدة; عدة; عدة الوفاة; عدة الطلاق|قروء; أشهر; وضع حمل; إحداد; سكنى
munakahat|ihdad; berkabung; masa berkabung; ihdad istri|الإحداد; إحداد|زينة; طيب; حداد; معتدة; ثياب
munakahat|ila; ila'; sumpah tidak menggauli istri; sumpah ila|الإيلاء; إيلاء|أربعة أشهر; فيء; مول; يمين; طلاق
munakahat|zhihar; dzihar; menyamakan istri dengan ibu; zihar|الظهار; ظهار|كفارة; عود; أمي; مظاهر; تحريم
munakahat|li'an; lian; menuduh istri berzina; sumpah li'an|اللعان; لعان|قذف; نفي ولد; أربع شهادات; غضب; فرقة
munakahat|radha'; persusuan; saudara sesusuan; menyusui; mahram sepersusuan; rada'|الرضاع; رضاع; الرضاعة|خمس رضعات; حولين; لبن; تحريم; مرضعة
munakahat|hadhanah; pengasuhan anak; hak asuh; hak asuh anak; hadanah|الحضانة; حضانة|أم; تمييز; تخيير; شروط; كفالة
munakahat|kafaah; kesetaraan dalam nikah; sekufu; kufu; kafa'ah|الكفاءة; كفاءة|نسب; دين; حرية; صنعة; سلامة
munakahat|nikah mut'ah; nikah muhallil; nikah tahlil; nikah syighar; nikah yang batal|نكاح المتعة; نكاح المحلل; نكاح الشغار|بطلان; توقيت; نهي; تحليل; شغار
munakahat|fasakh; fasakh nikah; aib dalam nikah; khiyar dalam nikah; cacat suami istri|الفسخ; فسخ النكاح; خيار العيب|جب; عنة; جنون; برص; عيب
munakahat|nikah beda agama; menikahi ahli kitab; menikah dengan non muslim; nikah dengan kafir|نكاح الكتابية; أهل الكتاب; نكاح الكافرة|كتابية; إسلام; ذمي; ردة; مجوسية
munakahat|walimah; walimatul urs; undangan pernikahan; resepsi nikah; memenuhi undangan|الوليمة; وليمة العرس; إجابة الدعوة|دعوة; عرس; وجوب; منكر; طعام
munakahat|hak suami istri; kewajiban suami istri; nusyuz; istri durhaka; pergaulan suami istri|حقوق الزوجين; النشوز; عشرة الزوجين|ناشز; طاعة; وعظ; هجر; ضرب
# ---------- JINAYAT, HUDUD, PERADILAN ----------
jinayat|qishash; qisas; pembunuhan; membunuh; hukum bunuh; hukuman pembunuh; jinayat|القصاص; قصاص; القتل; الجنايات|عمد; شبه عمد; خطأ; ولي الدم; عفو
jinayat|diyat; diat; denda pembunuhan; tebusan darah; denda melukai; arsy|الدية; دية; الديات; الأرش|مائة من الإبل; مغلظة; عاقلة; أرش; غرة
jinayat|hudud; had; hukuman had; pidana islam; hukum pidana islam|الحدود; حد; الحدود والتعزير|إمام; شبهة; سقوط; حد; بينة
jinayat|zina; hukuman zina; rajam; cambuk; had zina|الزنا; زنا; حد الزنا; الرجم|محصن; بكر; جلد; تغريب; مائة; أربعة شهود
jinayat|qadzaf; menuduh zina; tuduhan zina; had qadzaf|القذف; قذف; حد القذف|ثمانين; محصن; بينة; لعان; قاذف
jinayat|pencurian; mencuri; potong tangan; sariqah; hukuman pencuri|السرقة; سرقة; حد السرقة; القطع|نصاب; ربع دينار; حرز; قطع; يد
jinayat|perampokan; hirabah; qutha'ut thariq; begal; perampok|الحرابة; قطاع الطريق; حرابة|محارب; قتل; صلب; نفي; طريق
jinayat|minuman keras; khamr; mabuk; syurb khamr; miras; hukuman peminum khamr|شرب الخمر; الخمر; حد الشرب; المسكر|أربعين; ثمانين; سكر; مسكر; جلد
jinayat|murtad; riddah; keluar dari islam; orang murtad; hukum murtad|الردة; ردة; المرتد|استتابة; قتل; ثلاثة أيام; إسلام; كفر
jinayat|pemberontak; bughat; memberontak; baghi|البغاة; البغي; بغاة|إمام; تأويل; شوكة; قتال; طاعة
jinayat|ta'zir; takzir; hukuman diskresi; hukuman selain had|التعزير; تعزير|إمام; اجتهاد; ضرب; حبس; معصية
jinayat|jihad; perang; kafir harbi; kafir dzimmi; jizyah; ahli dzimmah; hukum perang|الجهاد; جهاد; الجزية; أهل الذمة|حربي; ذمي; أمان; غنيمة; فيء; أسير
jinayat|peradilan; hakim; qadhi; syarat hakim; qadha; kehakiman|القضاء; القاضي; قضاء|حاكم; ولاية; اجتهاد; عدالة; حكم
jinayat|gugatan; pembuktian; da'wa; bayyinah; saksi; sumpah penggugat; peradilan perdata; penggugat tergugat|الدعاوى والبينات; الدعوى; البينة|مدعي; مدعى عليه; يمين; شاهد; نكول
jinayat|kesaksian; syarat saksi; syahadah; saksi adil; persaksian; kesaksian wanita|الشهادات; الشهادة; شروط الشاهد|عدالة; مروءة; رد; ذكورة; عدد
jinayat|pengakuan; iqrar; mengaku|الإقرار; إقرار|مقر; مقر له; صحة; رجوع; مكلف
jinayat|budak; memerdekakan budak; itq; wala; mukatab; ummu walad; tadbir; hamba sahaya|العتق; عتق; الولاء; المكاتب; أم الولد; التدبير|رقيق; رقبة; عبد; مكاتبة; ولاء
# ---------- FARAIDH ----------
faraidh|waris; faraidh; pembagian warisan; ahli waris; mawaris; hukum waris; warisan|الفرائض; المواريث; الإرث; الميراث|وارث; مورث; تركة; نصيب; فرض
faraidh|ashabul furudh; bagian waris pasti; furudh muqaddarah; bagian tertentu; bagian waris; furudh|أصحاب الفروض; الفروض المقدرة|نصف; ربع; ثمن; ثلثان; ثلث; سدس
faraidh|ashabah; asabah; ashabah binnafsi; ashabah bil ghair; ashabah ma'al ghair; sisa waris|العصبة; العصبات; عصبة بالنفس; عصبة بالغير; عصبة مع الغير|ابن; أخ; عم; أب; معتق
faraidh|hijab waris; terhalang waris; hajb; hijab hirman; hijab nuqshan|الحجب; حجب الحرمان; حجب النقصان; المحجوب|ابن; أب; حرمان; نقصان; محجوب
faraidh|aul; radd; masalah aul; masalah radd; kelebihan harta waris; kekurangan harta waris|العول; الرد; أصل المسألة|أصل المسألة; فرائض; زيادة; نقص; عول
faraidh|dzawil arham; kerabat rahim; dzawil arham waris|ذوو الأرحام; الأرحام|عمة; خال; خالة; بنت بنت; ابن أخت
faraidh|penghalang waris; mani' irts; pembunuh tidak mewarisi; beda agama waris; budak waris; terhalang mewarisi|موانع الإرث; الرق; القتل; اختلاف الدين|قتل; رق; كفر; لا يرث; مانع
faraidh|waris kakek; waris saudara; kakek dan saudara; muqasamah; bagian kakek|الجد والإخوة; المقاسمة; ميراث الجد|جد; إخوة; سدس; ثلث الباقي; مقاسمة
faraidh|waris anak dalam kandungan; waris khuntsa; waris orang hilang; mafqud; waris janin|ميراث الحمل; ميراث الخنثى; المفقود|حمل; توقف; غائب; خنثى; ولادة
`;

// Keluarga kata untuk perluasan kueri (varian berbobot rendah): bentuk kata benda/kerja/jamak dan sinonim SEJATI. Jangan memasukkan kata yang hanya "berkaitan".
export const KELUARGA_FIQH = [
  ['بقر', 'بقرة', 'أبقار', 'جاموس'], ['غنم', 'شاة', 'شياه', 'ضأن', 'معز'], ['إبل', 'بعير', 'أباعر', 'ناقة'], ['نعم', 'أنعام', 'أنعام'],
  ['وضوء', 'توضأ', 'يتوضأ'], ['تيمم', 'يتيمم'], ['طهارة', 'طهر', 'طاهر', 'تطهير'], ['حيض', 'حائض', 'محيض'], ['نفاس', 'نفساء'], ['استحاضة', 'مستحاضة'],
  ['سجود', 'سجد', 'يسجد', 'ساجد'], ['ركوع', 'ركع', 'راكع'], ['قنوت', 'يقنت'], ['إمام', 'إمامة', 'يؤم'], ['مأموم', 'اقتداء', 'يقتدي'], ['سفر', 'مسافر', 'يسافر'],
  ['حدث', 'أحدث', 'محدث'], ['جنازة', 'ميت', 'موتى', 'جنائز'], ['كفن', 'تكفين', 'مكفن'], ['دفن', 'يدفن', 'مدفون'],
  ['فطر', 'مفطر', 'أفطر', 'مفطرات'], ['حج', 'حاج', 'حجاج'], ['عمرة', 'معتمر'], ['إحرام', 'محرم', 'أحرم'], ['طواف', 'طاف', 'يطوف'], ['سعي', 'يسعى'],
  ['أضحية', 'أضاحي', 'ضحية', 'ضحى'], ['عقيقة', 'عق', 'يعق'], ['ذبح', 'ذكاة', 'ذبيحة', 'ذابح'], ['صيد', 'صائد', 'مصيد'], ['نذر', 'ناذر', 'منذور'], ['يمين', 'أيمان', 'حلف', 'حالف'],
  ['بيع', 'يبيع', 'مبيع', 'بائع'], ['شراء', 'اشترى', 'يشتري', 'مشتر'], ['ربا', 'ربوي', 'ربويات'], ['إجارة', 'أجرة', 'استئجار', 'مستأجر'], ['رهن', 'مرهون', 'مرتهن'],
  ['وكالة', 'توكيل', 'وكيل', 'موكل'], ['ضمان', 'كفالة', 'ضامن', 'كفيل'], ['حوالة', 'محيل', 'محتال'], ['شركة', 'شريك', 'شركاء'], ['قراض', 'مضاربة'],
  ['وقف', 'تحبيس', 'موقوف'], ['هبة', 'هدية', 'وهب'], ['وصية', 'وصايا', 'موصى', 'أوصى'], ['لقطة', 'ملتقط', 'التقط'], ['صلح', 'مصالحة'], ['غصب', 'غاصب', 'مغصوب'],
  ['وديعة', 'إيداع', 'مودع'], ['عارية', 'إعارة', 'استعارة'], ['قرض', 'اقتراض', 'مقترض'], ['حجر', 'محجور', 'سفيه'],
  ['نكاح', 'تزويج', 'زواج', 'منكوحة'], ['ولي', 'ولاية', 'أولياء'], ['مهر', 'صداق', 'مهور'], ['طلاق', 'طلق', 'يطلق', 'مطلقة'], ['خلع', 'مخالعة', 'يخالع'],
  ['رجعة', 'ارتجاع', 'راجع', 'يراجع'], ['عدة', 'معتدة', 'تعتد'], ['رضاع', 'رضاعة', 'مرضع', 'رضعات'], ['حضانة', 'حاضن', 'محضون'], ['نفقة', 'منفق', 'ينفق', 'إنفاق'],
  ['خطبة', 'خاطب', 'مخطوبة', 'خطب'], ['نشوز', 'ناشز', 'نشزت'],
  ['قتل', 'قاتل', 'مقتول', 'يقتل'], ['دية', 'ديات', 'أرش'], ['زنا', 'زاني', 'زانية'], ['قذف', 'قاذف', 'مقذوف'], ['سرقة', 'سارق', 'سرق'], ['ردة', 'مرتد', 'ارتد'],
  ['شهادة', 'شاهد', 'شهود', 'بينة'], ['دعوى', 'مدعي', 'مدعى'], ['قضاء', 'قاض', 'قضاة'], ['حد', 'حدود'], ['عتق', 'معتق', 'أعتق'],
  ['إرث', 'ميراث', 'وارث', 'ورث', 'مواريث'], ['عصبة', 'عصبات', 'عاصب'], ['حجب', 'محجوب', 'يحجب'], ['فرائض', 'فريضة', 'فروض'],
];
