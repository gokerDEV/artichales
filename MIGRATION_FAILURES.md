# MIGRATION Failure Audit 

Bu rapor `MIGRATION.md` icindeki tum zorunlu maddelerin kod tabanina birebir denetimidir.  
Durum kodlari:
- `PASS`: Madde uygulanmis
- `FAIL`: Madde eksik/yanlis/yarim
- `PARTIAL`: Kismi uygulama var, RFC standardini tam karsilamiyor

## 1) RFC Madde Kapsam Matrisi

### Phase 1 - Editor Subsystem Hardening

1.1.1 `src/editor/config/extensions.ts` zorunlu yolu  
- Durum: `FAIL`  
- Kanit: `extensions` dosyasi `src/components/artichales/editor/config/extensions.ts` altinda (`src/components/artichales/editor/mdx-editor.tsx:16`).

1.1.2 `src/editor/config/completions.ts` zorunlu yolu  
- Durum: `FAIL`  
- Kanit: `completions` dosyasi `src/components/artichales/editor/config/completions.ts` altinda (`src/components/artichales/editor/mdx-editor.tsx:15`).

1.1.3 `mdx-editor.tsx` yalnizca DOM bridge + lifecycle olmali  
- Durum: `FAIL`  
- Kanit: Dosyada konfigurasyon/syntax/completion/state-switch mantigi var (`src/components/artichales/editor/mdx-editor.tsx:40`, `:53-78`, `:112-157`).

1.2 Cursor stabilization (guarded veya diff)  
- Durum: `PASS`  
- Kanit: `hasFocus` guard + conditional replace var (`src/components/artichales/editor/mdx-editor.tsx:163-170`).

1.3 300ms debounce boundary (updateListener pipeline tetiklememeli)  
- Durum: `PASS`  
- Kanit: `updateListener` sadece `onChange` yapiyor (`src/components/artichales/editor/mdx-editor.tsx:70-78`), pipeline postu 300ms timeout ile dis katmanda (`src/components/artichales/surfaces/editor-preview-surface.tsx:145-151`).

### Phase 2 - Global State Decomposition

2.1 Monolitik `useDocument` kaldirilmali, granular selector mimarisi olmali  
- Durum: `FAIL`  
- Kanit: `useDocument` hala monolitik `DocumentSource` donuyor (`src/hooks/use-document.ts:118`, `:219`, `:286-317`).  
- Kanit: `useWorkspaceStore()` selector'suz kullaniliyor (`src/hooks/use-document.ts:220`, `src/components/artichales/surfaces/editor-preview-surface.tsx:126`), bu global rerender tetikler.

### Phase 3 - Asynchronous Pipeline Engine

3.1.1 Main thread 300ms debounce sonra worker `EXECUTE_PIPELINE` gondermeli  
- Durum: `PASS`  
- Kanit: `setTimeout(300)` + `postMessage({ type: "EXECUTE_PIPELINE"... })` var (`src/components/artichales/surfaces/editor-preview-surface.tsx:145-151`).

3.1.2 Worker `unified + validation + registry` isletmeli  
- Durum: `PASS`  
- Kanit: Worker `runDocumentPipeline` cagiriyor (`src/workers/pipeline.worker.ts:96-125`), pipeline icinde parse/validation/analysis var (`src/lib/document-pipeline.ts:540+`).

3.1.3 Main thread sonucu alip store patch etmeli  
- Durum: `PASS`  
- Kanit: `PIPELINE_SUCCESS -> setPipelineResult` (`src/components/artichales/surfaces/editor-preview-surface.tsx:132-136`).

3.1 Constraint: Worker DOM'dan tamamen izole olmali, React render mantigi olmamali  
- Durum: `FAIL`  
- Kanit: Worker icinde `window/document` polyfill yaziliyor (`src/workers/pipeline.worker.ts:28-83`).  
- Kanit: Pipeline worker tarafinda render hook calistiriyor (`src/lib/document-pipeline.ts:462-501`, `:516`), bu React render pluginlarini worker icine cekiyor.

### Phase 4 - 3-Tier Directive Memoization

4.1 Tier 1 container: Store'dan `referenceRegistry[identity]` selector ile okumali  
- Durum: `FAIL`  
- Kanit: Numbering map AST traverse ile uretiliyor, store selector yok (`src/components/artichales/preview/shared/markdown-content.tsx:104-145`).

4.1 Tier 2 label: numara/baslik metnini ayri render etmeli  
- Durum: `FAIL`  
- Kanit: Label mantigi direkt plugin render bloklarina gomulu (`src/components/artichales/plugins/plotty.render.plugin.tsx:343-387`, `src/components/artichales/plugins/datatable.render.plugin.tsx:157-241`).

4.1 Tier 3 visual engine: `React.memo` + sadece `pluginId,dataPayload` props  
- Durum: `FAIL`  
- Kanit: `PlottyChart` memo degil (`src/components/artichales/plugins/plotty.render.plugin.tsx:219`).  
- Kanit: Visual render parentte caption/number ile ayni render yoluna bagli (`src/components/artichales/plugins/plotty.render.plugin.tsx:373-387`).

4.1 Kural: Visual engine `number/title` almamali  
- Durum: `FAIL`  
- Kanit: Number/caption ayni component agacinda birlikte hesaplanip rerender zinciri olusturuyor (`src/components/artichales/plugins/plotty.render.plugin.tsx:343-387`, `src/components/artichales/plugins/datatable.render.plugin.tsx:157-241`).

### Phase 5 - Deterministic Scroll Synchronization

5.1 Tum block-level elemanlara `data-source-offset` enjekte edilmeli  
- Durum: `PARTIAL`  
- Kanit: Enjeksiyon pipeline asamasinda var (`src/lib/document-pipeline.ts:403-408`) ama final render asamasinda degil.  
- Kanit: Datatable render yolunda node props iletilmedigi icin offset kaybi riski var (`src/components/artichales/plugins/plotty.render.plugin.tsx:306-313`).

5.2 Source -> Preview otomatik offset tabanli sync  
- Durum: `FAIL`  
- Kanit: Otomatik cursor-sync yok; sadece butonla heading-id tabanli hizalama var (`src/components/artichales/surfaces/editor-preview-surface.tsx:494-515`).  
- Kanit: RFC'deki `[data-source-offset]` query algoritmasi uygulanmamis.

5.3 Preview -> Source otomatik `IntersectionObserver` sync  
- Durum: `FAIL`  
- Kanit: `IntersectionObserver` kullanimi yok (repo taramasi).  
- Kanit: Sadece butonla "ilk gorunen heading" seciliyor (`src/components/artichales/surfaces/editor-preview-surface.tsx:518-555`).

5.3.4 `jumpToOffsetSignal` dependency ile kesin tetik  
- Durum: `FAIL`  
- Kanit: `jumpToOffsetSignal` bilincli sekilde ignore ediliyor (`src/components/artichales/editor/mdx-editor.tsx:92`, `:97`), effect yalniz `jumpToOffset` degisince calisiyor (`:176-188`).

## 2) Kritik Ek Mimari/Performans Aciklari (RFC disi ama blocker)

F-001 Eski worker cevabinin yeni durumu overwrite etme riski  
- Kanit: `requestId/sequence` kontrolu yok; gelen her `PIPELINE_SUCCESS` direkt apply ediliyor (`src/components/artichales/surfaces/editor-preview-surface.tsx:132-136`).
- Etki: Hizli yazimda out-of-order cevaplar stale AST/diagnostic gosterebilir.

F-002 Datatable index/cozumleme anahtar uyumsuzlugu  
- Kanit: Parser `data-datatable-source` yazar (`src/components/artichales/plugins/datatable.parser.plugin.tsx:94`), index cikarma `data-table-source` okuyor (`src/components/artichales/preview/shared/markdown-content.tsx:130`).
- Etki: Datatable numbering/ref esitlenmesi bazi durumlarda bozulur.

F-003 Fazla genis store aboneligi nedeniyle gereksiz rerender  
- Kanit: `useWorkspaceStore()` selector'suz kullaniliyor (`src/hooks/use-document.ts:220`, `src/components/artichales/surfaces/editor-preview-surface.tsx:126`).
- Etki: Pipeline sonucundaki ilgisiz degisiklikler editor/surface agacini da rerender eder.

## 3) TODO/FIXME Satir Taramasi

Komut: `rg -n "TODO|FIXME|XXX|HACK" --glob '!bun.lock' --glob '!public/models/**' .`  
Sonuc: Kod yorumu seviyesinde acik TODO/FIXME/HACK satiri bulunmadi.

Not: `MIGRATION.md` icindeki zorunlu maddeler bu raporda tek tek kapsandi; atlanan checklist satiri yok.

## 4) Kullanici Bildirimi Bazli Ek Denetim (Kod Kanitiyla)

Bu bolum, ilettigin maddelerin kod karsiligini tek tek denetler. Kod degistirilmemistir.

U-001 Print preview'da header/footer yapilari gorunmuyor  
- Durum: `CONFIRMED`  
- Kanit: Print akisi `print-preview.tsx` icinde sadece Paged.js ile `sourceElement.innerHTML` render ediyor; header/footer DOM uretimi yok (`src/components/artichales/preview/print/print-preview.tsx:147-149`, `:206-250`).  
- Kanit: Header/footer uretimi yapan servis var ama bagli degil (`src/components/artichales/preview/print/pagination.service.ts:271-385`), `print-preview.tsx` bu servisi import/cagirmiyor.

U-002 Footer olmadigi icin sayfa numaralari da yok  
- Durum: `CONFIRMED`  
- Kanit: `pageNumber` token uretimi sadece kullanilmayan `pagination.service.ts` icinde (`src/components/artichales/preview/print/pagination.service.ts:237-247`, `:313-343`).  
- Kanit: Canli print preview tarafinda page number yazan/ureten bir render yolu yok (`src/components/artichales/preview/print/print-preview.tsx:63-85`, `:206-250`).

U-003 Frontmatter validation hatali; `references: - source: "./refs.bib"` olmamali  
- Durum: `CONFIRMED`  
- Kanit: Frontmatter schema `.passthrough()` oldugu icin ekstra alanlari kabul ediyor (`src/lib/document-pipeline.ts:90-105`).  
- Kanit: Varsayilan `article.mda` zaten bu alani iceriyor (`src/workspace/defaults/article.mda:11-12`), yani sistem bunu hata saymiyor.

U-004 `Unable to layout item: <p node=\"[object Object]\" ...>`  
- Durum: `HIGH CONFIDENCE ROOT CAUSE`  
- Kanit: Paragraph renderer `node` propunu ayiklamadan DOM'a yayiyor (`src/components/artichales/preview/shared/markdown-content.tsx:179-205`), bu dogrudan `node=\"[object Object]\"` benzeri hatali DOM attr uretir.  
- Etki: Paged.js layout safhasinda beklenmeyen DOM ozellikleriyle cakisma olasiligi yuksek.

U-005 Print preview'da title/keywords/abstract tekrarlaniyor  
- Durum: `PARTIAL CONFIRMED`  
- Kanit: Print preview icinde ayni icerik iki kez DOM'da tutuluyor: gizli source (`pagedSourceRef`) + paged sonucu (`pagedPreviewRef`) (`src/components/artichales/preview/print/print-preview.tsx:208-219`, `:246-250`).  
- Kanit: Ayrica `DocumentRenderContent` title core + article + references core uretir (`src/components/artichales/preview/shared/document-render-content.tsx:73-90`); Paged.js clone akisiyla cift render etkisi olusabilir.
- Not: Tekrarlamanin gorunur ciktisi runtime verisine bagli; kod tarafinda tekrar riski acik.

U-006 `cite` ve `ref` renderlari bozuk  
- Durum: `CONFIRMED`  
- Kanit: `ref` numaralandirma index'i AST taramasinda `data-table-source` okuyor (`src/components/artichales/preview/shared/markdown-content.tsx:130`) fakat parser `data-datatable-source` yaziyor (`src/components/artichales/plugins/datatable.parser.plugin.tsx:94`); datatable ref/index eslesmesi bozuluyor.  
- Kanit: `p` renderer node leak problemi (`src/components/artichales/preview/shared/markdown-content.tsx:179-205`) inline ref/cite yapisini da bozabilecek gecersiz DOM uretiyor.

U-007 Editor dinamik autocomplete bozuk  
- Durum: `CONFIRMED`  
- Kanit: `completions` prop degisse bile mevcut file state varsa yeniden state olusturulmuyor (`existingState || createEditorState(...)`) (`src/components/artichales/editor/mdx-editor.tsx:133-143`).  
- Kanit: Ayni dosya acikken effect erken donuyor (`src/components/artichales/editor/mdx-editor.tsx:124-126`); bu nedenle yeni bib/ref hedefleri completion kaynagina yansimiyor.

U-008 Ikinci `abstract` yazinca syntax/diagnostic hatasi gelmeli ama gelmiyor  
- Durum: `CONFIRMED`  
- Kanit: Duplicate directive hatasi core analizde uretiliyor (`article-directive-identity-duplicate`) (`src/lib/article-analysis.ts:125-133`).  
- Kanit: UI tarafi `core` kaynakli article hatalarini filtreleyip atiyor; sadece `parser|plugin` aliyor (`src/hooks/use-document.ts:256`, `:283`).  
- Sonuc: Duplicate abstract hatasi pipeline'da olusuyor ama ekrana dusmuyor.

U-009 `:::abstract[data] ... :::` hata vermeli ama vermiyor  
- Durum: `CONFIRMED`  
- Kanit: Directive data-file zorunlulugu sadece `plotty` ve `datatable` icin tanimli (`src/lib/article-analysis.ts:52`, `:110-117`), `abstract` icin kisit yok.  
- Kanit: `parseDirectiveTargets` `abstract[data]` kullanimini engelleyen bir kural icermiyor (`src/lib/article-analysis.ts:88-148`).

U-010 SPEC'e aykiri noktalar var  
- Durum: `CONFIRMED`  
- Kanit (SPEC 10.2 / 19.3): print preview'da repeated header/footer/page number gereksinimi var, implementasyonda aktif degil (U-001/U-002).  
- Kanit (SPEC 14.5 / 18.4): duplicate directive identity error olmasi gerekir; hesaplanip UI'da baskilaniyor (U-008).  
- Kanit (SPEC 9.6): referans autocomplete indexed targetlardan gelmeli; dinamik yenilenme bozuk (U-007).

U-011 Paged.js dogru kullanilmiyor / tartismali  
- Durum: `CONFIRMED (mimari entegrasyon eksik)`  
- Kanit: Paged.js var (`import("pagedjs")`) fakat header/footer/page numbering modeli Paged.js tarafinda entegre degil (`src/components/artichales/preview/print/print-preview.tsx:141-149`, `:63-85`).  
- Kanit: Header/footer/page tree hesaplayan `pagination.service.ts` izole ve devre disi.

U-012 "Ek/geriye donuk rollback desteklerini kaldir" talepleri  
- Durum: `CONFIRMED (kodda rollback/compat blocklari var)`  
- Kanit: Worker'da genis polyfill/compat katmani var (`window/self/document/$Refresh*`) (`src/workers/pipeline.worker.ts:28-83`).  
- Kanit: Paged.js export uyumlulugu icin coklu ctor fallback var (`src/components/artichales/preview/print/print-preview.tsx:23-41`).  
- Not: Bu bolum tespit niteligindedir; kaldirma islemi bu raporda yapilmamistir.

U-013 AGENT.md'ye uymayan yerler  
- Durum: `CONFIRMED`  
- Kanit (Rule 1 - Never use any): cok sayida `any` kullanimi var (`src/hooks/use-document.ts:223,236,247,271,282,293,306`; `src/lib/document-pipeline.ts:365,368,370,404`; `src/workers/pipeline.worker.ts:29`; `src/components/artichales/preview/shared/markdown-content.tsx:119`).  
- Kanit (Rule 3 - structured patterns): string based if/else dallanma devam ediyor (`src/components/artichales/editor/mdx-editor.tsx:33-37`).

U-014 Align kesinlikle calismiyor  
- Durum: `CONFIRMED`  
- Kanit: Align akisi otomatik degil, sadece iki butonla manuel trigger (`src/components/artichales/surfaces/editor-preview-surface.tsx:494-555`).  
- Kanit: Block-level `data-source-offset` tabanli algoritma yerine heading-id tabanli kismi yaklasim var (`src/components/artichales/surfaces/editor-preview-surface.tsx:498-510`, `:522-545`).  
- Kanit: `jumpToOffsetSignal` propu editorde bilincli ignore ediliyor (`src/components/artichales/editor/mdx-editor.tsx:92`, `:97`), tekrar ayni offset sinyalinin garantili tetigi yok.

### Runtime Dogrulama Notu 

- `bun -e` ile duplicate abstract senaryosunda pipeline gercekten `error:core:article-directive-identity-duplicate` uretiyor.  
- Ayni sekilde `:::abstract[data]` senaryosunda pipeline hic diagnostic uretmiyor (kisit olmadigini dogruluyor).  
- Sonuc: Sorun "hesaplanmiyor" degil; bir kisim sorunlar "hesaplaniyor ama UI katmaninda filtrelenip gizleniyor" sinifinda.

## 5) Hedefe Yonelik Kisa Sonuc

- Bildirdigin tum maddeler kod seviyesinde incelendi ve bu dosyaya eklendi.  
- Ozellikle kritik kok nedenler: `core` diagnostic filtrelenmesi, paragraph renderer `node` leak'i, datatable ref key uyumsuzlugu, ve print header/footer akisinin devre disi olmasi.
