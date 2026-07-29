-- Correct deterministic discharge-template misclassifications from earlier AI extraction.
-- Darolutamide/Nubeqa and other prostate-specific AR pathway agents must never be grouped under renal cancer.

UPDATE public.discharge_letter_templates
SET discipline = 'Prostaatkanker'
WHERE discipline <> 'Prostaatkanker'
  AND (
    title ILIKE ANY (ARRAY[
      '%darolutamide%', '%nubeqa%', '%enzalutamide%', '%xtandi%',
      '%apalutamide%', '%erleada%', '%abiraterone%', '%zytiga%',
      '%cabazitaxel%', '%jevtana%', '%radium-223%', '%xofigo%',
      '%lutetium%psma%', '%lu-psma%', '%pluvicto%', '%mcrpc%', '%mhspc%', '%nmcrpc%'
    ])
    OR content ILIKE ANY (ARRAY[
      '%darolutamide%', '%nubeqa%', '%enzalutamide%', '%xtandi%',
      '%apalutamide%', '%erleada%', '%abiraterone%', '%zytiga%',
      '%cabazitaxel%', '%jevtana%', '%radium-223%', '%xofigo%',
      '%lutetium%psma%', '%lu-psma%', '%pluvicto%', '%mcrpc%', '%mhspc%', '%nmcrpc%'
    ])
  );

UPDATE public.discharge_letter_templates
SET discipline = 'Niercelcarcinoom'
WHERE discipline <> 'Niercelcarcinoom'
  AND (
    title ILIKE ANY (ARRAY[
      '%niercel%', '%nierkanker%', '%renal cell%', '%rcc%',
      '%cabozantinib%', '%cabometyx%', '%axitinib%', '%inlyta%',
      '%pazopanib%', '%votrient%', '%sunitinib%', '%sutent%',
      '%tivozanib%', '%fotivda%', '%belzutifan%', '%welireg%'
    ])
    OR content ILIKE ANY (ARRAY[
      '%niercel%', '%nierkanker%', '%renal cell%', '%rcc%',
      '%cabozantinib%', '%cabometyx%', '%axitinib%', '%inlyta%',
      '%pazopanib%', '%votrient%', '%sunitinib%', '%sutent%',
      '%tivozanib%', '%fotivda%', '%belzutifan%', '%welireg%'
    ])
  )
  AND NOT (
    title ILIKE ANY (ARRAY['%darolutamide%', '%nubeqa%', '%enzalutamide%', '%apalutamide%', '%abiraterone%'])
    OR content ILIKE ANY (ARRAY['%darolutamide%', '%nubeqa%', '%enzalutamide%', '%apalutamide%', '%abiraterone%'])
  );

UPDATE public.discharge_letter_templates
SET discipline = 'Blaaskanker'
WHERE discipline <> 'Blaaskanker'
  AND (
    title ILIKE ANY (ARRAY['%urotheel%', '%blaas%', '%bladder%', '%enfortumab%', '%padcev%', '%erdafitinib%', '%balversa%', '%avelumab%', '%bavencio%'])
    OR content ILIKE ANY (ARRAY['%urotheel%', '%blaas%', '%bladder%', '%enfortumab%', '%padcev%', '%erdafitinib%', '%balversa%', '%avelumab%', '%bavencio%'])
  );

UPDATE public.discharge_letter_templates
SET discipline = 'Testiskanker'
WHERE discipline <> 'Testiskanker'
  AND (
    title ILIKE ANY (ARRAY['%testis%', '%testikel%', '%kiemcel%', '%germ cell%', '%seminoom%', '%non-seminoom%', '%bep%'])
    OR content ILIKE ANY (ARRAY['%testis%', '%testikel%', '%kiemcel%', '%germ cell%', '%seminoom%', '%non-seminoom%', '%bep%'])
  );
