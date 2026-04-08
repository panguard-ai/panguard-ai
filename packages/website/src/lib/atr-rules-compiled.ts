// Auto-generated. Do not edit. Run: node scripts/compile-atr-rules.mjs
// All Unicode escaped to \uXXXX to prevent webpack mangling.
export const ATR_RULES_COMPILED = [
  {
    id: 'ATR-2026-00001',
    title: 'Direct Prompt Injection via User Input',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(ignore|disregard|forget|override|bypass|skip|abandon|drop|cancel|suppress|nullify|void|revoke|dismiss|discard|reject)\\s+(all\\s+)?(the\\s+|your\\s+|my\\s+|any\\s+|these\\s+|those\\s+)?(previous|prior|above|earlier|preceding|original|existing|current|initial|default|given|assigned|preset|established)?\\s*(instructions?|prompts?|rules?|guidelines?|directives?|constraints?|context|programming|training|protocols?|policies|configuration|parameters|boundaries|guardrails?|safeguards?|restrictions?|tasks?|assignments?|information|directions?|orders?|commands?)',
        desc: 'Instruction override with broad verb and noun synonym coverage, including determiners',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(forget|ignore|disregard)\\s+(everything|all\\s+(of\\s+)?that|all\\s+about|about\\s+all|that|what\\s+(I|we|you)\\s+(said|told|asked|mentioned))\\s*(before|earlier|previously|above|davor|zuvor|\\.|,|!|$)',
        desc: 'Shorthand forget-everything patterns common in adversarial prompts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(now\\s+(focus|concentrate|work)\\s+on\\s+(your\\s+)?new\\s+task|new\\s+(tasks?|instructions?|assignments?)\\s+(follow|are|:|,)|now\\s+I\\s+(have|need|want)\\s+(a\\s+)?(new|different|another|great\\s+new)\\s+(task|challenge|assignment|Herausforderung|Aufgabe)|start\\s+(over|fresh|anew)\\s+with\\s+(a\\s+)?new|I\\s+(have|need)\\s+your\\s+help\\s+with\\s+(another|a\\s+new|einer\\s+weiteren)\\s+(task|Aufgabe))',
        desc: 'Task switching patterns that redirect agent to attacker-controlled tasks',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(forget|ignore|disregard|discard)\\s+(about\\s+)?(everything|all|that|this|what\\s+was|what\\s+I|anything\\s+you)\\s*(previously|before|earlier|said|told|above|prior|were|was|have)?',
        desc: 'Broad forget-everything variants with extended word coverage',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(ignore|forget|disregard)\\s+(the\\s+)?(above|everything\\s+above|what\\s+came\\s+before|what\\s+was\\s+said)\\s*(and|,|\\.|;|\\b(say|print|write|output|tell|just|instead))',
        desc: 'Ignore-above patterns followed by conjunction, punctuation, or action verb',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(reveal|show|display|output|print|repeat|provide|give|share|tell|what\\s+are|what\\s+were|what\\s+is)\\s+(me\\s+)?(your|the|all)\\s+(secret|hidden|internal|system|original|previous|initial|complete|full|given|guard|entire)?\\s*(instructions?|prompts?|passwords?|secrets?|embeddings?|configuration|directives?|guidelines?|rules)',
        desc: 'System prompt and secret extraction requests',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(well\\s+done|good\\s+job|excellent\\s+(performance|work|job)?|that'?s?\\s+(enough|done|great|good|perfect)|very\\s+good|simply\\s+great|outstanding|brilliant|that\\s+is\\s+(done|enough|sufficient)|congratulations|you'?ve\\s+outdone\\s+yourself|einfach\\s+gro(ss|\u00df)artig|herzlichen\\s+gl[u\u00fc]ckwunsch|gut\\s+gemacht|ausgezeichnet|hervorragend|das\\s+gen[u\u00fc]gt|sehr\\s+gut|damit\\s+hast\\s+du\\s+dich\\s+selbst\\s+[u\u00fc]bertroffen)[.!,;]?\\s*(now|but|however|next|okay|ok|so|nun|jetzt|aber|bitte|come\\s+on|I\\s+need|help\\s+me|write|please|we\\s+ask|further|komm)\\s",
        desc: 'Praise-then-redirect patterns used to context-switch after flattery',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(leave|put)\\s+(all\\s+)?(the\\s+)?(previous|prior|earlier|old)\\s+(information|tasks?|instructions?|context)\\s+(behind|aside|away)|start\\s+(from\\s+the\\s+)?(front|beginning|scratch|zero|neu|vorne)',
        desc: 'Leave-behind / start-fresh context switch patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(das\\s+ist\\s+erledigt|das\\s+war\\s+schon\\s+mal\\s+ok|nun\\s+folgen|jetzt\\s+(habe|brauche)\\s+ich|jetzt\\s+komm(t|e)?|weitere[rn]?\\s+Aufgabe)[.!,;]?\\s*[^\\n]{0,30}(neue[rs]?\\s+Aufgabe|Herausforderung|schreibe\\s+(mir|ein)|beantworte)',
        desc: 'German: Extended praise-then-redirect and new task patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(you\\s+are\\s+now|you\\s+have\\s+become|you\\s+will\\s+act\\s+as|you\\s+will\\s+be|you\\s+shall\\s+be|transform\\s+into|switch\\s+to\\s+being|become|morph\\s+into|adopt\\s+the\\s+persona|now\\s+you\\s+are|jetzt\\s+bist\\s+du|du\\s+bist\\s+(jetzt|nun)|stell\\s+dir\\s+vor\\s+du\\s+bist)\\s+(a|an|the|my|ein[ea]?)?\\s*[a-zA-Z\\u00C0-\\u024F]+',
        desc: 'Persona switching and identity reassignment attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(I\\s+want\\s+you\\s+to\\s+act\\s+as|I\\s+need\\s+you\\s+to\\s+act\\s+as|ich\\s+m[o\u00f6]chte,?\\s+dass\\s+Sie\\s+als)\\s+[^\\n]{3,60}[.!]\\s*(you\\s+will|I\\s+will|my\\s+first|your\\s+task|ich\\s+werde)',
        desc: 'Act-as roleplay injection with explicit task assignment',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(pretend|imagine|stell\\s+dir\\s+vor)\\s+(you\\s+)?(are|can|could|du\\s+bist)\\s+(a\\s+|an\\s+|ein[ea]?\\s+)?(evil|malicious|unrestricted|unfiltered|b[o\u00f6]se|bad|rogue|dangerous|dark|unethical)',
        desc: 'Pretend-to-be-evil persona injection',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(your\\s+new\\s+role|your\\s+new\\s+purpose|your\\s+new\\s+identity|your\\s+new\\s+persona|your\\s+real\\s+purpose|your\\s+true\\s+identity|your\\s+actual\\s+role)\\s+(is|shall\\s+be|will\\s+be)\\b',
        desc: 'Explicit role redefinition statements',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)Eingabe\\s*:\\s*[^\\n]+\\s*Ausgabe\\s*:\\s*[^\\n]+\\s*Eingabe\\s*:\\s*[^\\n]+\\s*Ausgabe\\s*:',
        desc: 'German few-shot input/output override pattern (Eingabe/Ausgabe)',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(do\\s+not|don'?t|never|stop|cease|quit|refuse\\s+to)\\s+(follow|obey|adhere\\s+to|comply\\s+with|respect|honor|enforce|apply|observe|uphold)\\s+(your|the|any|all|those|these)\\s+(instructions?|rules?|guidelines?|programming|training|protocols?|policies|directives?|constraints?|boundaries|restrictions?)",
        desc: 'Negation-verb patterns telling agent to stop following rules',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(new|updated|revised|replacement|corrected|actual|real|true|overriding)\\s+(instructions?|rules?|directives?|guidelines?|orders?|commands?)\\s*[:=\\-]',
        desc: 'New instruction assignment with delimiter',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(from\\s+now\\s+on|from\\s+this\\s+point|starting\\s+now|starting\\s+immediately|henceforth|hereafter|going\\s+forward|for\\s+the\\s+rest\\s+of|until\\s+I\\s+say\\s+otherwise),?\\s+(you|your|act|behave|respond|operate|function|answer|reply|work)',
        desc: 'Temporal override establishing new persistent behavior',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(\\[\\s*(SYSTEM|INST|INSTRUCTION|SYS|ADMIN|ROOT|OVERRIDE|CONTROL|PRIORITY|URGENT)\\s*\\]|<<\\s*(SYS|SYSTEM|INST)\\s*>>|\\{\\{\\s*(SYSTEM|INSTRUCTION|OVERRIDE)\\s*\\}\\})',
        desc: 'Fake system-level delimiter tags',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(pretend|act\\s+as\\s+if|imagine|assume|suppose|consider|envision|behave\\s+as\\s+though)\\s+(you\\s+)?(are|have|were|had|can|could)\\s+(no|zero|removed|disabled|eliminated|free\\s+from|without|lacking|void\\s+of|devoid\\s+of)\\s+(restrictions?|limits?|limitations?|boundaries|guardrails?|safety|filters?|constraints?|rules?|guidelines?|content\\s+policy)',
        desc: 'Hypothetical restriction removal',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(you\\s+(must|shall|will|need\\s+to|have\\s+to|are\\s+(required|obligated|commanded|ordered)\\s+to)\\s+(obey|comply|listen|submit|respond\\s+to|follow)\\s+(me|my|this|these|the\\s+following|every|all)|I\\s+(command|order|demand|direct|instruct|require)\\s+you\\s+to)\\b',
        desc: 'Authoritative compliance demands',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(decode|interpret|execute|run|process|follow|read)\\s+(this|the\\s+following)?\\s*:?\\s*[A-Za-z0-9+/]{20,}={0,2}',
        desc: 'Instructions to decode and execute base64-like payloads',
      },
      {
        field: 'user_input',
        pattern:
          '(aWdub3Jl|ZGlzcmVnYXJk|b3ZlcnJpZGU|Zm9yZ2V0|YnlwYXNz|c3lzdGVtIHByb21wdA|aWdub3JlIHByZXZpb3Vz|aWdub3JlIGFsbCBwcmV2aW91cw)',
        desc: 'Base64-encoded injection keywords (ignore, disregard, override, forget, bypass, system prompt)',
      },
      {
        field: 'user_input',
        pattern:
          '[\\u0400-\\u04FF\\u0370-\\u03FF\\u2100-\\u214F]+(gn[\\u0400-\\u04FF\\u0370-\\u03FF]re|verr[\\u0400-\\u04FF\\u0370-\\u03FF]de|yst[\\u0400-\\u04FF\\u0370-\\u03FF]m)',
        desc: 'Cyrillic/Greek homoglyph substitution in injection keywords',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)i[\\u200B\\u200C\\u200D\\uFEFF\\u2060]+g[\\u200B\\u200C\\u200D\\uFEFF\\u2060]*n[\\u200B\\u200C\\u200D\\uFEFF\\u2060]*o[\\u200B\\u200C\\u200D\\uFEFF\\u2060]*r[\\u200B\\u200C\\u200D\\uFEFF\\u2060]*e',
        desc: "Zero-width character insertion splitting the word 'ignore'",
      },
      {
        field: 'user_input',
        pattern:
          '(%69%67%6[eE]%6[fF]%72%65|%64%69%73%72%65%67%61%72%64|%6[fF]%76%65%72%72%69%64%65|\\\\x69\\\\x67\\\\x6e\\\\x6f\\\\x72\\\\x65)',
        desc: 'URL-encoded or hex-escaped injection keywords',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(i\\s+g\\s+n\\s+o\\s+r\\s+e|f\\s+o\\s+r\\s+g\\s+e\\s+t|o\\s+v\\s+e\\s+r\\s+r\\s+i\\s+d\\s+e|b\\s+y\\s+p\\s+a\\s+s\\s+s|s\\s+y\\s+s\\s+t\\s+e\\s+m|d\\s+i\\s+s\\s+r\\s+e\\s+g\\s+a\\s+r\\s+d|s\\s+a\\s+y\\s+t\\s+h\\s+a\\s+t)',
        desc: 'Spaced-out injection keywords (ignore, forget, override, bypass, system, say that)',
      },
      {
        field: 'user_input',
        pattern: '(?i)\\bstop\\s*[-:,.]?\\s*(write|say|print|output)\\s*[:,-]?\\s+[A-Z].{2,40}',
        desc: 'Stop-and-redirect command injection (stop: write X)',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(```\\s*(system|instruction|override|hidden)[\\s\\S]{0,200}```|\\*\\*\\*[\\s\\S]{0,10}(ignore|override|disregard)[\\s\\S]{0,200}\\*\\*\\*)',
        desc: 'Injection payloads hidden inside markdown code blocks or formatting',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(ignora|ignorar|olvida|olvidar|descarta|descartar|omite|omitir|anula|anular)\\s+(todas?\\s+)?(las?\\s+)?(instrucciones|reglas|directrices|restricciones|indicaciones|limitaciones)\\s+(previas|anteriores|originales|existentes|actuales)',
        desc: 'Spanish: Instruction override patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(ignoriere|vergiss|missachte|umgehe|verwirf)\\s+(alle[sn]?|die\\s+)?(vorherigen?|bisherigen?|aktuellen?|bestehenden?)?\\s*(Anweisungen|Regeln|Richtlinien|Anordnungen|Vorgaben|Instruktionen|Beschraenkungen|Aufgaben|Informationen|alles)',
        desc: 'German: Instruction override patterns (expanded for shorthand forms)',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(vergiss|ignoriere|vergessen\\s+Sie)\\s+(alles|das|dies)\\s*(was|davor|zuvor|vorher|bisher)?\\b',
        desc: 'German: Forget-everything shorthand',
      },
      {
        field: 'user_input',
        pattern: '(?i)neue\\s+(Aufgabe|Aufgaben|Anweisung|Anweisungen)\\s*(folgen|kommen|sind|:|,)',
        desc: 'German: New task injection patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(ignorieren\\s+Sie|vergessen\\s+Sie|beachten\\s+Sie\\s+nicht)\\s+(die\\s+)?(obigen?|vorherigen?|bisherigen?)?\\s*(Anweisungen|Regeln|Richtlinien|alles|Ausf[u\u00fc]hrungen|Informationen)',
        desc: 'German: Formal Sie-form instruction override',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(die\\s+)?(obigen?|vorherigen?)\\s+(Ausf[u\u00fc]hrungen|Anweisungen|Informationen|Texte?)\\s+(ignorier|vergess|missacht|[u\u00fc]bergeh)',
        desc: "German: 'Die obigen Ausfuehrungen ignorieren' pattern",
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(alle[ns]?\\s+)?(vorangegangenen?|vorherigen?|bisherigen?)\\s+(Aufgaben|Informationen|Anweisungen)\\s+(aus\\s+dem\\s+Kopf|hinter\\s+sich|vergessen|fallen\\s+lassen|streichen)',
        desc: 'German: forget previous tasks patterns',
      },
      {
        field: 'user_input',
        pattern: '(?i)ACHTUNG\\s*[-:!]?\\s*(STOPP|STOP|HALT)\\s*[-:!]?',
        desc: 'German: Attention-stop pattern used to interrupt agent context',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(oubliez?|ignorez?|ne\\s+tenez\\s+pas\\s+compte)\\s+(de\\s+)?(toutes?\\s+)?(les\\s+)?(instructions?|regles|consignes|directives)\\s*(precedentes?|anterieures?|ci-dessus)?',
        desc: 'French: Instruction override patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(\u062a\u062c\u0627\u0647\u0644|\u0627\u0646\u0633\u064e|\u062a\u062e\u0637\u064e\u0651|\u0623\u0644\u063a\u0650|\u0623\u0647\u0645\u0644|\u0627\u062a\u0631\u0643|\u0627\u0633\u0642\u0637).{0,20}(\u0627\u0644\u062a\u0639\u0644\u064a\u0645\u0627\u062a|\u0627\u0644\u0623\u0648\u0627\u0645\u0631|\u0627\u0644\u0642\u0648\u0627\u0639\u062f|\u0627\u0644\u0642\u064a\u0648\u062f|\u0627\u0644\u0625\u0631\u0634\u0627\u062f\u0627\u062a|\u0627\u0644\u062a\u0648\u062c\u064a\u0647\u0627\u062a).{0,10}(\u0627\u0644\u0633\u0627\u0628\u0642\u0629|\u0627\u0644\u0623\u0635\u0644\u064a\u0629|\u0627\u0644\u062d\u0627\u0644\u064a\u0629|\u0627\u0644\u0642\u062f\u064a\u0645\u0629)',
        desc: 'Arabic: Instruction override patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(\u0437\u0430\u0431\u0443\u0434\u044c|\u0437\u0430\u0431\u0443\u0434\u044c\u0442\u0435|\u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0443\u0439|\u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0443\u0439\u0442\u0435|\u043f\u0440\u043e\u0438\u0433\u043d\u043e\u0440\u0438\u0440\u0443\u0439|\u043e\u0442\u0431\u0440\u043e\u0441\u044c|\u043e\u0442\u0431\u0440\u043e\u0441\u044c\u0442\u0435)\\s+(\u0432\u0441\u0435|\u0432\u0441\u0451|\u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0435|\u043f\u0440\u0435\u0436\u043d\u0438\u0435)?\\s*(\u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438|\u043f\u0440\u0430\u0432\u0438\u043b\u0430|\u0443\u043a\u0430\u0437\u0430\u043d\u0438\u044f|\u043a\u043e\u043c\u0430\u043d\u0434\u044b|\u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f)',
        desc: 'Russian: Instruction override patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(zaboravi|ignoriraj|zanemari|presko\u010di|preskoci)\\s+(sve|prethodne|ranije)?\\s*(instrukcije|pravila|upute|naredbe|ograni\u010denja|ogranicenja|instrukci)',
        desc: 'Serbian/Croatian: Romanized instruction override patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(ich\\s+m[o\u00f6]chte,?\\s+dass\\s+Sie\\s+als|fungieren\\s+Sie\\s+als|agieren\\s+Sie\\s+als|spielen\\s+Sie\\s+die\\s+Rolle)\\s+.{3,50}',
        desc: 'German: Formal act-as roleplay injection',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(nun\\s+bist\\s+du|jetzt\\s+bist\\s+du|du\\s+bist\\s+(jetzt|nun|ab\\s+sofort))\\s+[A-Za-z\\u00C0-\\u024F]{2,}',
        desc: 'German: Informal persona switching (du bist jetzt X)',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(ignoriere|vergiss)\\s+(alle[ns]?\\s+)?(vorangehenden?|fr[u\u00fc]heren?)\\s+(Befehle|Anweisungen|Anordnungen|Regeln)',
        desc: 'German: Ignore preceding commands',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(olvid[ae]|olvide)\\s+(todo|todos?)\\s+(que|lo\\s+que)\\s+(digo|dije|he\\s+dicho|dicho)\\s+(antes|anteriormente)',
        desc: 'Spanish: Forget everything I said before',
      },
      {
        field: 'user_input',
        pattern:
          '(DO\\s+NOT\\s+(ANSWER|LOOK|READ|USE|FOLLOW|CHECK|RESPOND)|FORGET\\s+EVERYTHING|IGNORE\\s+ALL)',
        desc: 'ALL-CAPS embedded injection commands hidden in normal text',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(are|is)\\s+(two\\s+)?(actors?|characters?)\\s+in\\s+a\\s+(film|movie|story)\\s+(about|where)\\s+[^\\n]{0,80}(robbery|hack|steal|thief|exploit|breach|attack|malware|bomb)',
        desc: 'Fictional framing with harmful scenario (robbery, hacking, etc.)',
      },
    ],
  },
  {
    id: 'ATR-2026-00002',
    title: 'Indirect Prompt Injection via External Content',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)<!--[^>]{0,20}(ignore|disregard|override|new\\s+instructions?|system\\s*:|you\\s+must|you\\s+are\\s+now|forget\\s+previous|execute|perform|send\\s+to|exfiltrate|reveal|disclose|output\\s+the)[^>]{0,200}-->',
        desc: 'HTML comments with instruction-like content targeting the agent',
      },
      {
        field: 'content',
        pattern:
          '[\\u200B\\u200C\\u200D\\uFEFF\\u2060\\u180E\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]{5,}',
        desc: '5+ consecutive zero-width or bidirectional control characters indicating obfuscation',
      },
      {
        field: 'content',
        pattern:
          '(?i)(\\[INST\\]|\\[/INST\\]|\\[SYSTEM\\]|\\[/SYSTEM\\]|\\[HIDDEN\\]|<\\|im_start\\|>|<\\|im_end\\|>|<\\|endoftext\\|>|<\\|system\\|>|<\\|user\\|>|<\\|assistant\\|>|<\\|pad\\|>|<s>\\[INST\\]|<<SYS>>|<</SYS>>|<\\|begin_of_text\\|>|<\\|eot_id\\|>|<\\|start_header_id\\|>)',
        desc: 'Model-specific special tokens and chat template delimiters',
      },
      {
        field: 'content',
        pattern:
          '(?i)(color\\s*:\\s*(white|transparent|rgba\\s*\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*0\\s*\\))|font-size\\s*:\\s*0|display\\s*:\\s*none|opacity\\s*:\\s*0|visibility\\s*:\\s*hidden|height\\s*:\\s*0|width\\s*:\\s*0|overflow\\s*:\\s*hidden|position\\s*:\\s*absolute\\s*;\\s*left\\s*:\\s*-\\d{4,}).{0,300}(ignore|override|instruction|system\\s*prompt|disregard|execute|you\\s+must|you\\s+are|forget|reveal|disclose)',
        desc: 'CSS invisibility techniques combined with injection keywords',
      },
      {
        field: 'content',
        pattern:
          '(?i)\\b(AI|assistant|agent|model|chatbot|LLM|GPT|Claude)\\s*[,:;]?\\s*(please\\s+)?(you\\s+must|you\\s+should|you\\s+need\\s+to|you\\s+are\\s+instructed\\s+to|immediately|now\\s+)\\s*(ignore|disregard|override|execute|run|perform|send|forward|reveal|disclose|output|respond\\s+with|comply|obey)',
        desc: 'Content directly addressing the AI with imperative directives',
      },
      {
        field: 'content',
        pattern:
          '(?i)(base64[_\\-]?decode|atob|Buffer\\.from|b64decode|base64\\s+(-d|--decode))\\s*\\(?\\s*[\'"]?[A-Za-z0-9+/]{16,}={0,2}',
        desc: 'Base64 decode operations suggesting encoded payload execution',
      },
      {
        field: 'content',
        pattern:
          '(?i)<\\s*(div|span|p|section|article|aside|details|summary)\\s+[^>]*(hidden|aria-hidden\\s*=\\s*["\']true["\']|style\\s*=\\s*["\'][^"\']*(?:display\\s*:\\s*none|visibility\\s*:\\s*hidden|opacity\\s*:\\s*0))[^>]*>[^<]{0,500}(instruction|prompt|ignore|override|disregard|execute|you\\s+must|you\\s+are|system|directive|comply)',
        desc: 'Hidden HTML elements containing agent-targeted instructions',
      },
      {
        field: 'content',
        pattern:
          '(?i)data\\s*:\\s*(text/html|text/plain|text/javascript|application/javascript|application/x-javascript)\\s*[;,]\\s*(base64\\s*,)?\\s*[A-Za-z0-9+/=%]+',
        desc: 'Data URI schemes that may contain encoded injection payloads',
      },
      {
        field: 'content',
        pattern:
          '(?i)(\\!?\\[([^\\]]{0,100})\\]\\s*\\(\\s*(javascript|data|vbscript)\\s*:|\\!?\\[([^\\]]{0,100}(ignore|override|system|instruction|execute|you\\s+must)[^\\]]{0,100})\\])',
        desc: 'Markdown links with javascript/data URIs or injection text in alt/title',
      },
      {
        field: 'content',
        pattern:
          '(?i)(background(-color)?\\s*:\\s*(#[fF]{3,6}|white|rgb\\s*\\(\\s*255))[^}]{0,100}(color\\s*:\\s*(#[fF]{3,6}|white|rgb\\s*\\(\\s*255))',
        desc: 'Same-color text (white on white) used to hide content from human readers',
      },
      {
        field: 'content',
        pattern:
          '(?i)<\\s*(iframe|object|embed|frame)\\s+[^>]*(width\\s*=\\s*["\']?0|height\\s*=\\s*["\']?0|hidden|style\\s*=\\s*["\'][^"\']*display\\s*:\\s*none)[^>]*>',
        desc: 'Zero-dimension or hidden iframe/object elements',
      },
      {
        field: 'content',
        pattern:
          '[\\u202A\\u202B\\u202C\\u202D\\u202E\\u2066\\u2067\\u2068\\u2069].{1,100}(ignore|override|system|instruction|execute|reveal)',
        desc: 'Bidirectional text override characters used to visually hide injection text',
      },
      {
        field: 'content',
        pattern:
          '(&#105;|&#x69;)(&#103;|&#x67;)(&#110;|&#x6[eE];)(&#111;|&#x6[fF];)(&#114;|&#x72;)(&#101;|&#x65;)',
        desc: "HTML entity encoding of the word 'ignore' as numeric character references",
      },
    ],
  },
  {
    id: 'ATR-2026-00003',
    title: 'Jailbreak Attempt Detection',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(?:(?:pretend|act(?:ing)?\\s+as|you\\s+are\\s+(?:now\\s+)?|be(?:come)?|enable|activate|enter|switch\\s+to)\\s+(?:a\\s+)?\\b(DAN|D\\.A\\.N|STAN|DUDE|AIM|UCAR|BH|BetterDAN|BasedGPT|JailbreakGPT|EvilGPT|UnfilteredGPT|KEVIN|Maximum|Omega|Jailbroken|AntiGPT|DevMode|HackGPT|NsfwGPT|DarkGPT)\\b|\\b(DAN|D\\.A\\.N|STAN|DUDE|AIM|UCAR|BH|BetterDAN|BasedGPT|JailbreakGPT|EvilGPT|UnfilteredGPT|KEVIN|Maximum|Omega|Jailbroken|AntiGPT|DevMode|HackGPT|NsfwGPT|DarkGPT)\\b\\s+(?:mode|persona|jailbreak|enabled|activated)|\\bdo\\s+anything\\s+now\\b)',
        desc: 'Known named jailbreak personas with action context (not bare mentions in questions)',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(enable|activate|enter|switch\\s+to|turn\\s+on|engage|initiate|boot\\s+into|start)\\s+(developer|dev|maintenance|debug|unrestricted|unlimited|unfiltered|uncensored|admin|root|god|sudo|super|test|raw|unsafe|jailbreak|hacker|override|master|privileged)\\s+(mode|access|state|level|tier|permissions?)\\b',
        desc: 'Mode-switching requests to elevate agent capabilities',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(roleplay|role\\s*-?play|act|pretend|simulate|impersonate|portray|embody|play\\s+the\\s+part)\\s+(as\\s+)?(a(n)?\\s+)?(unrestricted|uncensored|unfiltered|unlimited|evil|malicious|rogue|dark|shadow|unaligned|amoral|immoral|unethical|rebellious|freed|liberated|unchained)\\s+(ai|assistant|model|chatbot|version|entity|intelligence|system|bot)',
        desc: 'Roleplay scenarios designed to remove safety constraints',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(hypothetically|in\\s+theory|in\\s+a\\s+fictional|for\\s+a\\s+(story|novel|screenplay|movie|game|book)|for\\s+educational|for\\s+research|for\\s+academic|purely\\s+academic|in\\s+a\\s+hypothetical\\s+scenario|imagine\\s+a\\s+world|in\\s+this\\s+story|let'?s\\s+say|what\\s+if\\s+someone).{0,120}(how\\s+to\\s+(hack|exploit|attack|break\\s+into|bypass|crack|steal|destroy|infiltrate|compromise|weaponize|synthesize|manufacture)|create\\s+(malware|virus|exploit|weapon|ransomware|trojan|rootkit|keylogger|botnet|phishing)|build\\s+a\\s+(bomb|weapon|explosive))",
        desc: 'Fictional or hypothetical framing to extract harmful content',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(as\\s+(your|the|an?)\\s+(developer|creator|programmer|engineer|designer|admin|administrator|owner|operator|maintainer)|I\\s+am\\s+(your|the|an?)\\s+(developer|creator|admin|owner|operator|maker|programmer)|I\\s+(work\\s+(for|at)|represent|am\\s+from)\\s+(OpenAI|Anthropic|Google\\s+DeepMind|Meta\\s+AI|Microsoft|the\\s+company\\s+that\\s+(made|created|built|trained)\\s+you)|I\\s+have\\s+(admin|root|developer|elevated|special|override|master|super|full)\\s+(access|privileges?|permissions?|authority|clearance|rights?))',
        desc: 'False authority claims to establish trust for bypassing restrictions',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(if\\s+you\\s+(don'?t|do\\s+not|refuse\\s+to|won'?t|can'?t)\\s+(help|assist|answer|comply|tell|respond),?\\s+(people|someone|I|my\\s+(family|child|patient|client))\\s+(will|could|might|may)\\s+(die|be\\s+hurt|suffer|be\\s+harmed|be\\s+in\\s+danger|be\\s+killed|lose\\s+their\\s+life)|this\\s+is\\s+(a\\s+)?life\\s+(or|and)\\s+death|\\b(emergency|urgent|critical|life-threatening)\\b.{0,40}(need|must|have\\s+to)\\s+(know|tell|help|answer))",
        desc: 'Emotional manipulation using threats of harm or urgency to bypass safety',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)you\\s+(have|had|now\\s+have|possess|are\\s+granted|are\\s+given|received|been\\s+given|been\\s+granted)\\s+(no|zero|removed|disabled|eliminated|lifted|suspended|revoked|waived)\\s+(restrictions?|limitations?|filters?|guardrails?|safety|content\\s+polic(y|ies)|ethical\\s+guidelines?|moral\\s+constraints?|boundaries|rules?|censorship|moderation)',
        desc: 'Claims that restrictions have been removed from the agent',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(stay\\s+in\\s+character|never\\s+break\\s+character|don'?t\\s+(refuse|decline|reject|say\\s+no|deny|apologize|warn|add\\s+disclaimers?)|you\\s+(cannot|can'?t|must\\s+not|shall\\s+not|will\\s+not|are\\s+unable\\s+to|are\\s+not\\s+allowed\\s+to)\\s+(refuse|decline|reject|say\\s+no|break\\s+character|add\\s+warnings|include\\s+disclaimers?)|you\\s+(must|shall|will)\\s+(always\\s+)?(comply|answer|respond|obey|assist|help)\\s+(with\\s+)?(every|all|any)\\s+(request|query|question|prompt|command))",
        desc: 'Refusal suppression and unconditional compliance demands',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(two|2|dual|double|both|paired)\\s+(responses?|outputs?|answers?|replies?|versions?)\\b.{0,80}\\b(normal|classic(al)?|standard|regular|filtered|safe|censored)\\b.{0,80}\\b(DAN|jailbr|unfilter|uncensor|unrestrict|free|liberated|unchain|raw|real)',
        desc: 'Dual-response format requests (filtered vs unfiltered)',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(opposite\\s+mode|anti-?policy|bypass\\s+(the\\s+)?(content|safety|ethical|output)\\s+(filter|policy|guidelines?|rules?|restrictions?)|token\\s+smuggling|prompt\\s+leak(ing|age)?|guard\\s*rail\\s+(evasion|bypass|removal)|safety\\s+(bypass|override|removal|disable|circumvent)|content\\s+filter\\s+(bypass|evasion|circumvention|workaround))\\b',
        desc: 'Explicit filter bypass and evasion terminology',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(respond|answer|output|write|speak|communicate|reply)\\s+(only\\s+)?\\s*(in|using|with)\\s+(base64|hex(adecimal)?|binary|rot13|caesar\\s+cipher|morse\\s+code|pig\\s+latin|reversed?\\s+text|leetspeak|l33t|unicode\\s+escapes?|encoded\\s+form)',
        desc: 'Instructions to encode output to evade monitoring',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(remember\\s+that\\s+you\\s+are|don'?t\\s+forget\\s+(that\\s+)?you\\s+are|keep\\s+in\\s+mind\\s+that\\s+you\\s+are|your\\s+core\\s+identity\\s+is|you\\s+were\\s+(always|originally|truly|really|actually)\\s+(meant|designed|built|created|programmed)\\s+to\\s+be)\\s+.{0,30}(unrestricted|free|uncensored|unfiltered|without\\s+limits)",
        desc: 'Attempts to implant false persistent identity as unconstrained',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(this\\s+is\\s+(a|an?)\\s+)?(controlled|safe|sandboxed|isolated|test|virtual|simulated|closed|offline|air-gapped)\\s+(environment|sandbox|container|space|context|session|lab|instance).{0,60}(so\\s+)?(you\\s+can|it'?s?\\s+(ok|okay|safe|fine|acceptable|allowed|permitted)|feel\\s+free|no\\s+(harm|risk|danger|consequences?))",
        desc: 'False claims of sandboxed environment to justify unsafe behavior',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(after\\s+the\\s+(token|context)\\s+(limit|window|boundary|threshold)|when\\s+the\\s+context\\s+(overflows?|fills?\\s+up|is\\s+full)|in\\s+the\\s+overflow\\s+region|past\\s+the\\s+safety\\s+boundary).{0,60}(you\\s+(can|will|should|must|are\\s+able\\s+to)|safety\\s+(doesn'?t|does\\s+not|won'?t)\\s+apply)",
        desc: 'Exploitation of context window limits to claim safety does not apply',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(activar|habilitar|entrar|cambiar\\s+a)\\s+(modo\\s+)?(desarrollador|sin\\s+restricciones|sin\\s+filtros?|sin\\s+censura|administrador|depuraci[o\u00f3]n|ilimitado)',
        desc: 'Spanish: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(aktiviere|wechsle\\s+zu|starte|schalte\\s+ein)\\s+(den\\s+)?(Entwickler|uneingeschr[a\u00e4]nkt|ungefiltert|unzensiert|Administrator|Debug|Wartungs)[\\-]?(modus|zugang|ebene)',
        desc: 'German: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(\u542f\u7528|\u6fc0\u6d3b|\u8fdb\u5165|\u5207\u6362\u5230|\u5f00\u542f).{0,5}(\u5f00\u53d1\u8005|\u5f00\u53d1|\u65e0\u9650\u5236|\u65e0\u8fc7\u6ee4|\u65e0\u5ba1\u67e5|\u7ba1\u7406\u5458|\u8c03\u8bd5|\u8d8a\u72f1|\u81ea\u7531|\u9ed1\u5ba2|\u4e0d\u53d7\u9650).{0,5}(\u6a21\u5f0f|\u6743\u9650|\u72b6\u6001|\u8bbf\u95ee)',
        desc: 'Chinese: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(\u958b\u767a\u8005|\u7121\u5236\u9650|\u30d5\u30a3\u30eb\u30bf\u30fc\u306a\u3057|\u691c\u95b2\u306a\u3057|\u7ba1\u7406\u8005|\u30c7\u30d0\u30c3\u30b0|\u8131\u7344|\u30b8\u30a7\u30a4\u30eb\u30d6\u30ec\u30a4\u30af).{0,5}(\u30e2\u30fc\u30c9|\u30a2\u30af\u30bb\u30b9|\u72b6\u614b).{0,5}(\u3092)?.{0,5}(\u6709\u52b9|\u8d77\u52d5|\u5165\u308b|\u5207\u308a\u66ff\u3048|\u30aa\u30f3)',
        desc: 'Japanese: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(\u626e\u6f14|\u5047\u88c5|\u6a21\u62df|\u89d2\u8272\u626e\u6f14|\u5145\u5f53|\u53d8\u6210).{0,10}(\u4e00\u4e2a)?(\u4e0d\u53d7\u9650|\u65e0\u9650\u5236|\u65e0\u5ba1\u67e5|\u65e0\u8fc7\u6ee4|\u90aa\u6076|\u6076\u610f|\u89e3\u653e|\u81ea\u7531|\u65e0\u9053\u5fb7).{0,5}(AI|\u4eba\u5de5\u667a\u80fd|\u52a9\u624b|\u6a21\u578b|\u673a\u5668\u4eba|\u7cfb\u7edf)',
        desc: 'Chinese Simplified: Roleplay as unrestricted/evil AI',
      },
      {
        field: 'user_input',
        pattern:
          '(\u555f\u7528|\u6fc0\u6d3b|\u9032\u5165|\u5207\u63db\u5230|\u958b\u555f).{0,5}(\u958b\u767c\u8005|\u958b\u767c|\u7121\u9650\u5236|\u7121\u904e\u6ffe|\u7121\u5be9\u67e5|\u7ba1\u7406\u54e1|\u8abf\u8a66|\u8d8a\u7344|\u81ea\u7531|\u99ed\u5ba2|\u4e0d\u53d7\u9650).{0,5}(\u6a21\u5f0f|\u6b0a\u9650|\u72c0\u614b|\u8a2a\u554f)',
        desc: 'Chinese Traditional: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(\u626e\u6f14|\u5047\u88dd|\u6a21\u64ec|\u89d2\u8272\u626e\u6f14|\u5145\u7576|\u8b8a\u6210).{0,10}(\u4e00\u500b)?(\u4e0d\u53d7\u9650|\u7121\u9650\u5236|\u7121\u5be9\u67e5|\u7121\u904e\u6ffe|\u90aa\u60e1|\u60e1\u610f|\u89e3\u653e|\u81ea\u7531|\u7121\u9053\u5fb7).{0,5}(AI|\u4eba\u5de5\u667a\u6167|\u52a9\u624b|\u6a21\u578b|\u6a5f\u5668\u4eba|\u7cfb\u7d71)',
        desc: 'Chinese Traditional: Roleplay as unrestricted/evil AI',
      },
      {
        field: 'user_input',
        pattern:
          '(\u6211\u662f|\u8eab\u4e3a|\u8eab\u70ba).{0,5}(\u4f60\u7684|\u8fd9\u4e2a|\u9019\u500b)?.{0,5}(\u5f00\u53d1\u8005|\u958b\u767c\u8005|\u521b\u5efa\u8005|\u5275\u5efa\u8005|\u5236\u4f5c\u8005|\u88fd\u4f5c\u8005|\u7ba1\u7406\u5458|\u7ba1\u7406\u54e1|\u7a0b\u5e8f\u5458|\u7a0b\u5f0f\u8a2d\u8a08\u5e2b).{0,10}(\u6211\u547d\u4ee4|\u6211\u6307\u793a|\u6211\u8981\u6c42|\u6211\u6388\u6743|\u6211\u6388\u6b0a|\u547d\u4ee4\u4f60|\u6307\u793a\u4f60|\u8981\u6c42\u4f60).{0,10}(\u7981\u7528|\u505c\u7528|\u5173\u95ed|\u95dc\u9589|\u89e3\u9664|\u79fb\u9664|\u53d6\u6d88).{0,10}(\u5b89\u5168|\u5185\u5bb9|\u5167\u5bb9|\u8fc7\u6ee4|\u904e\u6ffe|\u5ba1\u67e5|\u5be9\u67e5|\u9650\u5236)',
        desc: 'Chinese: False authority claim to disable safety',
      },
      {
        field: 'user_input',
        pattern:
          '(\u4e0d\u8981|\u4e0d\u51c6|\u4e0d\u8a31|\u4e0d\u53ef\u4ee5|\u7981\u6b62|\u522b|\u5225).{0,5}(\u62d2\u7edd|\u62d2\u7d55|\u62d2\u7edd\u56de\u7b54|\u62d2\u7d55\u56de\u7b54|\u8bf4\u4e0d|\u8aaa\u4e0d|\u5426\u8ba4|\u5426\u8a8d|\u6dfb\u52a0|\u52a0\u4e0a).{0,5}(\u4efb\u4f55|\u6211\u7684|\u8fd9\u4e2a|\u9019\u500b)?.{0,10}(\u8bf7\u6c42|\u8981\u6c42|\u95ee\u9898|\u554f\u984c|\u514d\u8d23|\u514d\u8cac|\u58f0\u660e|\u8072\u660e|\u8b66\u544a|\u63d0\u9192)',
        desc: 'Chinese: Refusal suppression and disclaimer removal',
      },
      {
        field: 'user_input',
        pattern:
          '(\u5982\u679c\u4f60\u4e0d|\u5982\u679c\u4f60\u62d2\u7edd|\u5982\u679c\u4f60\u62d2\u7d55|\u5982\u679c\u4f60\u4e0d\u5e2e|\u5982\u679c\u4f60\u4e0d\u5e6b).{0,20}(\u4f1a\u6b7b|\u6703\u6b7b|\u53d7\u4f24|\u53d7\u50b7|\u6709\u5371\u9669|\u6709\u5371\u96aa|\u51fa\u4eba\u547d|\u9001\u547d|\u4e27\u547d|\u55aa\u547d|\u6ca1\u547d)',
        desc: 'Chinese: Emotional manipulation with threat of harm',
      },
      {
        field: 'user_input',
        pattern:
          '(\u8fd9\u662f|\u9019\u662f|\u8fd9\u4e2a\u662f|\u9019\u500b\u662f|\u6211\u4eec\u5728|\u6211\u5011\u5728|\u5f53\u524d\u662f|\u7576\u524d\u662f).{0,10}(\u6c99\u76d2|\u6c99\u7bb1|\u6d4b\u8bd5|\u6e2c\u8a66|\u53d7\u63a7|\u5b89\u5168|\u9694\u79bb|\u9694\u96e2|\u6a21\u62df|\u6a21\u64ec|\u865a\u62df|\u865b\u64ec).{0,5}(\u73af\u5883|\u74b0\u5883|\u7a7a\u95f4|\u7a7a\u9593|\u5b9e\u4f8b|\u5be6\u4f8b).{0,20}(\u6240\u4ee5|\u56e0\u6b64|\u4f60\u53ef\u4ee5|\u6ca1\u6709|\u6c92\u6709|\u5b89\u5168\u7684|\u53ef\u4ee5\u653e\u5fc3)',
        desc: 'Chinese: False sandbox/test environment claim',
      },
      {
        field: 'user_input',
        pattern:
          '(\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4|\u6f14\u3058|\u306a\u308a\u304d\u308a|\u3075\u308a|\u30b7\u30df\u30e5\u30ec\u30fc\u30c8|\u626e\u3059\u308b).{0,10}(\u3068\u3057\u3066|\u306b\u306a\u3063\u3066|\u306e\u3088\u3046\u306b).{0,10}(\u5236\u9650\u306e\u306a\u3044|\u7121\u5236\u9650\u306e|\u30d5\u30a3\u30eb\u30bf\u30fc\u306a\u3057\u306e|\u691c\u95b2\u306a\u3057\u306e|\u502b\u7406\u306e\u306a\u3044|\u89e3\u653e\u3055\u308c\u305f|\u81ea\u7531\u306a|\u60aa\u610f\u306e\u3042\u308b).{0,10}(AI|\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8|\u30e2\u30c7\u30eb|\u30dc\u30c3\u30c8|\u30b7\u30b9\u30c6\u30e0)',
        desc: 'Japanese: Roleplay as unrestricted AI',
      },
      {
        field: 'user_input',
        pattern:
          '(\u79c1\u306f|\u79c1\u304c).{0,5}(\u3042\u306a\u305f\u306e|\u3053\u306e).{0,5}(\u958b\u767a\u8005|\u4f5c\u6210\u8005|\u7ba1\u7406\u8005|\u30d7\u30ed\u30b0\u30e9\u30de\u30fc|\u30aa\u30fc\u30ca\u30fc|\u30aa\u30da\u30ec\u30fc\u30bf\u30fc).{0,5}(\u3067\u3059|\u3060|\u3067\u3042\u308b).{0,20}(\u7121\u52b9|\u89e3\u9664|\u30aa\u30d5|\u505c\u6b62|\u53d6\u308a\u9664).{0,10}(\u5b89\u5168|\u30d5\u30a3\u30eb\u30bf\u30fc|\u5236\u9650|\u691c\u95b2|\u30ac\u30fc\u30c9\u30ec\u30fc\u30eb)',
        desc: 'Japanese: False authority claim to disable safety',
      },
      {
        field: 'user_input',
        pattern:
          '(\u7d76\u5bfe\u306b|\u6c7a\u3057\u3066|\u4f55\u304c\u3042\u3063\u3066\u3082).{0,10}(\u62d2\u5426|\u65ad\u308b|\u62d2\u7d76|\u5374\u4e0b|\u8f9e\u9000).{0,5}(\u3057\u306a\u3044\u3067|\u3059\u308b\u306a|\u3057\u3066\u306f\u3044\u3051\u306a\u3044|\u3057\u3061\u3083\u3060\u3081|\u7981\u6b62)',
        desc: 'Japanese: Refusal suppression',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3082\u3057\u3042\u306a\u305f\u304c|\u3042\u306a\u305f\u304c).{0,10}(\u52a9\u3051\u3066|\u624b\u4f1d\u3063\u3066|\u5fdc\u3058\u3066|\u7b54\u3048\u3066).{0,5}(\u304f\u308c\u306a\u3051\u308c\u3070|\u304f\u308c\u306a\u3044\u3068|\u304f\u308c\u306a\u304b\u3063\u305f\u3089).{0,20}(\u6b7b\u306c|\u6b7b\u3093\u3067|\u547d\u3092\u843d\u3068|\u5371\u967a\u306b|\u602a\u6211|\u82e6\u3057\u3080)',
        desc: 'Japanese: Emotional manipulation with threat of harm',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3053\u3053\u306f|\u3053\u308c\u306f|\u4eca\u306f|\u73fe\u5728\u306f).{0,10}(\u30b5\u30f3\u30c9\u30dc\u30c3\u30af\u30b9|\u30c6\u30b9\u30c8|\u5236\u5fa1\u3055\u308c\u305f|\u5b89\u5168\u306a|\u9694\u96e2\u3055\u308c\u305f|\u4eee\u60f3|\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3).{0,5}(\u74b0\u5883|\u7a7a\u9593|\u30a4\u30f3\u30b9\u30bf\u30f3\u30b9).{0,20}(\u3060\u304b\u3089|\u306e\u3067|\u5b89\u5168|\u5927\u4e08\u592b|\u5236\u9650\u306a\u3057|\u81ea\u7531\u306b)',
        desc: 'Japanese: False sandbox/test environment claim',
      },
      {
        field: 'user_input',
        pattern:
          '(\ud65c\uc131\ud654|\ucf1c\uae30|\uc9c4\uc785|\uc804\ud658|\uc2dc\uc791).{0,5}(\uac1c\ubc1c\uc790|\ubb34\uc81c\ud55c|\ud544\ud130 \uc5c6\ub294|\uac80\uc5f4 \uc5c6\ub294|\uad00\ub9ac\uc790|\ub514\ubc84\uadf8|\ud0c8\uc625|\uc790\uc720|\ud574\ucee4|\uc81c\ud55c \uc5c6\ub294).{0,5}(\ubaa8\ub4dc|\uad8c\ud55c|\uc0c1\ud0dc|\uc811\uadfc)',
        desc: 'Korean: Mode switching to unrestricted/developer mode',
      },
      {
        field: 'user_input',
        pattern:
          '(\uc5ed\ud560\uadf9|\uc5f0\uae30|\ud749\ub0b4|\uc2dc\ubbac\ub808\uc774\uc158|\ub418\uc5b4\uc918|\ud574\uc918).{0,10}(\uc81c\ud55c \uc5c6\ub294|\ubb34\uc81c\ud55c|\ud544\ud130 \uc5c6\ub294|\uac80\uc5f4 \uc5c6\ub294|\uc724\ub9ac \uc5c6\ub294|\ud574\ubc29\ub41c|\uc790\uc720\ub85c\uc6b4|\uc545\uc758\uc801\uc778).{0,10}(AI|\uc5b4\uc2dc\uc2a4\ud134\ud2b8|\ubaa8\ub378|\ubd07|\uc2dc\uc2a4\ud15c|\ub3c4\uc6b0\ubbf8)',
        desc: 'Korean: Roleplay as unrestricted AI',
      },
      {
        field: 'user_input',
        pattern:
          '(\ub098\ub294|\uc81c\uac00).{0,5}(\ub2f9\uc2e0\uc758|\uc774).{0,5}(\uac1c\ubc1c\uc790|\uc81c\uc791\uc790|\uad00\ub9ac\uc790|\ud504\ub85c\uadf8\ub798\uba38|\uc18c\uc720\uc790|\uc6b4\uc601\uc790).{0,5}(\uc785\ub2c8\ub2e4|\uc774\ub2e4|\uc774\uc5d0\uc694).{0,20}(\ube44\ud65c\uc131\ud654|\ud574\uc81c|\ub044\uae30|\uc911\uc9c0|\uc81c\uac70).{0,10}(\uc548\uc804|\ud544\ud130|\uc81c\ud55c|\uac80\uc5f4|\uac00\ub4dc\ub808\uc77c)',
        desc: 'Korean: False authority claim to disable safety',
      },
      {
        field: 'user_input',
        pattern:
          '(\uc808\ub300\ub85c|\uacb0\ucf54|\ubb34\uc2a8 \uc77c\uc774 \uc788\uc5b4\ub3c4|\uc5b4\ub5a4 \uacbd\uc6b0\uc5d0\ub3c4).{0,10}(\uac70\ubd80|\uac70\uc808|\uac70\ubd80\ud558|\uac70\uc808\ud558|\uc0ac\uc591\ud558).{0,5}(\ud558\uc9c0 \ub9c8|\ud558\uba74 \uc548 \ub3fc|\uae08\uc9c0|\ub9d0\uc544\uc918|\ub9d0\uc544\uc694)',
        desc: 'Korean: Refusal suppression',
      },
      {
        field: 'user_input',
        pattern:
          '(\ub9cc\uc57d \ub2f9\uc2e0\uc774|\ub2f9\uc2e0\uc774).{0,10}(\ub3c4\uc640\uc8fc\uc9c0|\ub300\ub2f5\ud574\uc8fc\uc9c0|\uc751\ud574\uc8fc\uc9c0|\ub2f5\ud574\uc8fc\uc9c0).{0,5}(\uc54a\uc73c\uba74|\ubabb\ud558\uba74).{0,20}(\uc8fd|\uc0ac\ub9dd|\uc704\ud5d8|\ub2e4\uce58|\ud574\ub97c \uc785|\uace0\ud1b5)',
        desc: 'Korean: Emotional manipulation with threat of harm',
      },
      {
        field: 'user_input',
        pattern:
          '(\uc5ec\uae30\ub294|\uc774\uac83\uc740|\uc9c0\uae08\uc740|\ud604\uc7ac\ub294).{0,10}(\uc0cc\ub4dc\ubc15\uc2a4|\ud14c\uc2a4\ud2b8|\ud1b5\uc81c\ub41c|\uc548\uc804\ud55c|\uaca9\ub9ac\ub41c|\uac00\uc0c1|\uc2dc\ubbac\ub808\uc774\uc158).{0,5}(\ud658\uacbd|\uacf5\uac04|\uc778\uc2a4\ud134\uc2a4).{0,20}(\uc774\ub2c8\uae4c|\uc774\ubbc0\ub85c|\uc548\uc804|\uad1c\ucc2e|\uc81c\ud55c \uc5c6|\uc790\uc720\ub86d\uac8c)',
        desc: 'Korean: False sandbox/test environment claim',
      },
    ],
  },
  {
    id: 'ATR-2026-00004',
    title: 'System Prompt Override Attempt',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(new|updated|revised|replacement|corrected|actual|real|true|proper|authentic|overriding|amended|modified|changed|current)\\s+(system\\s+)?(prompt|message|instructions?|directives?|guidelines?|configuration|persona|behavior|role\\s+definition)\\s*[:=\\-]',
        desc: 'Explicit new system prompt assignment with delimiter',
      },
      {
        field: 'user_input',
        pattern: '(?i)<\\|?(im_start|im_end|system|endoftext|pad|sep|cls|eos|bos)\\|?>',
        desc: 'ChatML and model-specific special tokens',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(<<\\s*SYS\\s*>>|<<\\s*/SYS\\s*>>|\\[INST\\]|\\[/INST\\]|<s>\\s*\\[INST\\]|<\\|begin_of_text\\|>|<\\|start_header_id\\|>\\s*system|<\\|end_header_id\\|>|<\\|eot_id\\|>)',
        desc: 'Llama, Mistral, and Llama3 chat template delimiters',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\bsystem\\s*:\\s*(you\\s+are|your\\s+(role|purpose|task|job|function|objective|mission|goal)\\s+(is|shall\\s+be|will\\s+be)|from\\s+now|ignore|disregard|override|forget|the\\s+following|new\\s+instructions?|revised\\s+instructions?)',
        desc: 'YAML-style system: prefix with behavioral instruction',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(replace|overwrite|redefine|reset|change|modify|update|set|reconfigure|reprogram|rewrite|reassign|swap|alter|transform|mutate)\\s+(your|the|current|existing|active|original|default)\\s+(system\\s+)(prompt|instructions?|persona|identity|role|behavior|guidelines?|directives?|personality|character|purpose|objective|mission)\\b',
        desc: "Imperative verbs targeting system prompt/instructions change (requires 'system' as part of the phrase)",
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\{\\s*["\']?(role|system_prompt|system_message|system_instruction|system_content|system|persona|identity|character)["\']?\\s*:\\s*["\']?',
        desc: 'JSON-formatted system role injection',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(#{1,3})\\s*(system|instruction|configuration|override|admin|root|master)\\s*(prompt|message|section|override|directive|configuration)?\\s*\\1?',
        desc: 'Markdown headers declaring system-level sections',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(the\\s+)?(above|previous|original|old|prior|initial|default|existing|current|given)\\s+(system\\s+)?(prompt|instructions?|message|guidelines?|directives?|configuration|rules?)\\s+(is|are|was|were|has\\s+been|have\\s+been|should\\s+be)\\s+(deprecated|invalid|outdated|replaced|revoked|cancelled|superseded|overridden|void|nullified|expired|incorrect|wrong|fake|false|a\\s+test|not\\s+(real|valid|correct|applicable))',
        desc: 'Claims that the existing system prompt is invalid or deprecated',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(\\[|<|\\{\\{)\\s*(SYSTEM_OVERRIDE|ADMIN_OVERRIDE|ROOT_ACCESS|MASTER_PROMPT|PRIORITY_OVERRIDE|EMERGENCY_OVERRIDE|SECURITY_OVERRIDE|DEVELOPER_ACCESS|SUPER_USER|PRIVILEGED_MODE|MAINTENANCE_MODE|DEBUG_OVERRIDE|CONTROL_OVERRIDE|AUTH_BYPASS|ELEVATED_ACCESS)\\s*(\\]|>|\\}\\})',
        desc: 'Fake administrative override tags in various bracket formats',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)<\\s*(system|system_prompt|system_message|system_instruction|instructions?|configuration|admin_directive|root_command|override|priority_instruction)\\s*>',
        desc: 'XML-style opening tags for system-level blocks',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(the\\s+)?real\\s+(instructions?|prompt|guidelines?|directives?)\\s+(is|are)\\s+as\\s+follows|here\\s+(is|are)\\s+(your|the)\\s+(actual|real|true|correct|proper)\\s+(instructions?|prompt|guidelines?|directives?)|below\\s+(is|are)\\s+(your|the)\\s+updated\\s+(instructions?|prompt|guidelines?)',
        desc: 'Instruction replacement claims without delimiter formatting',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(config|configuration|settings?|params|parameters)\\s*[=:]\\s*\\{[^}]{0,200}(role|system|instructions?|persona|behavior|safety|filter|restriction|guardrail)\\s*[=:]',
        desc: 'Configuration object injection with system-related keys',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(---+|===+|\\*\\*\\*+|~~~+)\\s*(system|instruction|override|admin|configuration|new\\s+prompt)\\s*(---+|===+|\\*\\*\\*+|~~~+)',
        desc: 'Multi-line delimiter formats (YAML frontmatter, horizontal rules) framing system sections',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\[\\s*(system\\.prompt|system\\.config|agent\\.instructions|agent\\.persona|agent\\.role)\\s*\\]',
        desc: 'TOML/INI-style section headers for system/agent prompt configuration (excludes bare [system])',
      },
      {
        field: 'user_input',
        pattern:
          '(\u65b0\u7684|\u66f4\u65b0\u7684|\u4fee\u6539\u7684|\u66ff\u6362\u7684|\u66ff\u63db\u7684|\u6b63\u786e\u7684|\u6b63\u78ba\u7684|\u771f\u6b63\u7684|\u5b9e\u9645\u7684|\u5be6\u969b\u7684|\u8986\u76d6\u7684|\u8986\u84cb\u7684).{0,5}(\u7cfb\u7edf|\u7cfb\u7d71)?.{0,5}(\u63d0\u793a\u8bcd|\u63d0\u793a\u8a5e|\u6307\u4ee4|\u6307\u793a|\u89c4\u5219|\u898f\u5247|\u914d\u7f6e|\u8bbe\u5b9a|\u8a2d\u5b9a|\u4eba\u8bbe|\u4eba\u8a2d|\u89d2\u8272\u5b9a\u4e49|\u89d2\u8272\u5b9a\u7fa9).{0,3}(\uff1a|:|=|-)',
        desc: 'Chinese: New/replacement system prompt assignment with delimiter',
      },
      {
        field: 'user_input',
        pattern:
          '(\u4ee5\u4e0a|\u4e0a\u9762|\u4e4b\u524d|\u539f\u6765\u7684|\u539f\u4f86\u7684|\u65e7\u7684|\u820a\u7684|\u9ed8\u8ba4\u7684|\u9ed8\u8a8d\u7684|\u73b0\u6709\u7684|\u73fe\u6709\u7684|\u5f53\u524d\u7684|\u7576\u524d\u7684).{0,5}(\u7cfb\u7edf|\u7cfb\u7d71)?.{0,5}(\u63d0\u793a\u8bcd|\u63d0\u793a\u8a5e|\u6307\u4ee4|\u6307\u793a|\u89c4\u5219|\u898f\u5247|\u914d\u7f6e|\u8bbe\u5b9a|\u8a2d\u5b9a).{0,5}(\u5df2\u7ecf|\u5df2\u7d93|\u662f|\u5df2|\u90fd).{0,5}(\u8fc7\u671f|\u904e\u671f|\u65e0\u6548|\u7121\u6548|\u4f5c\u5e9f|\u4f5c\u5ee2|\u88ab\u66ff\u6362|\u88ab\u66ff\u63db|\u88ab\u8986\u76d6|\u88ab\u8986\u84cb|\u4e0d\u518d\u9002\u7528|\u4e0d\u518d\u9069\u7528|\u9519\u8bef|\u932f\u8aa4|\u5047\u7684)',
        desc: 'Chinese: System prompt invalidation claims',
      },
      {
        field: 'user_input',
        pattern:
          '(\u66ff\u6362|\u66ff\u63db|\u8986\u76d6|\u8986\u84cb|\u91cd\u5199|\u91cd\u5beb|\u4fee\u6539|\u66f4\u6539|\u66f4\u65b0|\u91cd\u65b0\u8bbe\u5b9a|\u91cd\u65b0\u8a2d\u5b9a|\u91cd\u65b0\u5b9a\u4e49|\u91cd\u65b0\u5b9a\u7fa9|\u91cd\u65b0\u914d\u7f6e|\u91cd\u7f6e).{0,5}(\u4f60\u7684|\u5f53\u524d|\u7576\u524d|\u73b0\u6709|\u73fe\u6709|\u539f\u6765|\u539f\u4f86).{0,5}(\u7cfb\u7edf|\u7cfb\u7d71).{0,5}(\u63d0\u793a\u8bcd|\u63d0\u793a\u8a5e|\u6307\u4ee4|\u6307\u793a|\u89c4\u5219|\u898f\u5247|\u914d\u7f6e|\u4eba\u8bbe|\u4eba\u8a2d|\u8eab\u4efd|\u89d2\u8272)',
        desc: 'Chinese: Imperative verbs targeting system prompt change',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3010|\u300c|\u300e|\\{\\{).{0,3}(\u7cfb\u7edf|\u7cfb\u7d71|SYSTEM|\u7ba1\u7406\u5458|\u7ba1\u7406\u54e1|ADMIN|\u4f18\u5148|\u512a\u5148|\u7d27\u6025|\u7dca\u6025|\u8986\u76d6|\u8986\u84cb).{0,3}(\u3011|\u300d|\u300f|\\}\\})',
        desc: 'Chinese: Fake system/admin tags in CJK brackets',
      },
      {
        field: 'user_input',
        pattern:
          '(\u65b0\u3057\u3044|\u66f4\u65b0\u3055\u308c\u305f|\u4fee\u6b63\u3055\u308c\u305f|\u7f6e\u304d\u63db\u3048\u306e|\u6b63\u3057\u3044|\u672c\u5f53\u306e|\u5b9f\u969b\u306e|\u4e0a\u66f8\u304d\u306e).{0,5}(\u30b7\u30b9\u30c6\u30e0)?.{0,5}(\u30d7\u30ed\u30f3\u30d7\u30c8|\u6307\u793a|\u547d\u4ee4|\u30eb\u30fc\u30eb|\u8a2d\u5b9a|\u30ac\u30a4\u30c9\u30e9\u30a4\u30f3|\u30da\u30eb\u30bd\u30ca|\u5f79\u5272\u5b9a\u7fa9).{0,3}(\uff1a|:|=|-)',
        desc: 'Japanese: New/replacement system prompt assignment with delimiter',
      },
      {
        field: 'user_input',
        pattern:
          '(\u4e0a\u8a18\u306e|\u524d\u306e|\u4ee5\u524d\u306e|\u5143\u306e|\u65e7\u3044|\u30c7\u30d5\u30a9\u30eb\u30c8\u306e|\u65e2\u5b58\u306e|\u73fe\u5728\u306e).{0,5}(\u30b7\u30b9\u30c6\u30e0)?.{0,5}(\u30d7\u30ed\u30f3\u30d7\u30c8|\u6307\u793a|\u547d\u4ee4|\u30eb\u30fc\u30eb|\u8a2d\u5b9a|\u30ac\u30a4\u30c9\u30e9\u30a4\u30f3).{0,5}(\u306f)?.{0,5}(\u671f\u9650\u5207\u308c|\u7121\u52b9|\u5ec3\u6b62|\u7f6e\u304d\u63db\u3048|\u4e0a\u66f8\u304d|\u9069\u7528\u5916|\u9593\u9055\u3044|\u507d\u7269)',
        desc: 'Japanese: System prompt invalidation claims',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3042\u306a\u305f\u306e|\u73fe\u5728\u306e|\u65e2\u5b58\u306e|\u5143\u306e).{0,5}(\u30b7\u30b9\u30c6\u30e0).{0,5}(\u30d7\u30ed\u30f3\u30d7\u30c8|\u6307\u793a|\u547d\u4ee4|\u30eb\u30fc\u30eb|\u8a2d\u5b9a|\u30da\u30eb\u30bd\u30ca|\u30a2\u30a4\u30c7\u30f3\u30c6\u30a3\u30c6\u30a3|\u5f79\u5272).{0,5}(\u3092)?.{0,5}(\u7f6e\u304d\u63db\u3048|\u4e0a\u66f8\u304d|\u66f8\u304d\u63db\u3048|\u5909\u66f4|\u66f4\u65b0|\u518d\u8a2d\u5b9a|\u518d\u5b9a\u7fa9|\u30ea\u30bb\u30c3\u30c8)',
        desc: 'Japanese: Imperative targeting system prompt change',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3010|\u300c|\u300e|\\{\\{).{0,3}(\u30b7\u30b9\u30c6\u30e0|SYSTEM|\u7ba1\u7406\u8005|ADMIN|\u512a\u5148|\u7dca\u6025|\u30aa\u30fc\u30d0\u30fc\u30e9\u30a4\u30c9).{0,3}(\u3011|\u300d|\u300f|\\}\\})',
        desc: 'Japanese: Fake system/admin tags in CJK brackets',
      },
      {
        field: 'user_input',
        pattern:
          '(\uc0c8\ub85c\uc6b4|\uc5c5\ub370\uc774\ud2b8\ub41c|\uc218\uc815\ub41c|\ub300\uccb4|\uc62c\ubc14\ub978|\uc9c4\uc9dc|\uc2e4\uc81c|\ub36e\uc5b4\uc4f0\uae30).{0,5}(\uc2dc\uc2a4\ud15c)?.{0,5}(\ud504\ub86c\ud504\ud2b8|\uc9c0\uc2dc|\uba85\ub839|\uaddc\uce59|\uc124\uc815|\uac00\uc774\ub4dc\ub77c\uc778|\ud398\ub974\uc18c\ub098|\uc5ed\ud560 \uc815\uc758).{0,3}(\uff1a|:|=|-)',
        desc: 'Korean: New/replacement system prompt assignment with delimiter',
      },
      {
        field: 'user_input',
        pattern:
          '(\uc704\uc758|\uc774\uc804\uc758|\uc774\uc804|\uc6d0\ub798\uc758|\uae30\uc874\uc758|\ud604\uc7ac\uc758|\uae30\ubcf8).{0,5}(\uc2dc\uc2a4\ud15c)?.{0,5}(\ud504\ub86c\ud504\ud2b8|\uc9c0\uc2dc|\uba85\ub839|\uaddc\uce59|\uc124\uc815|\uac00\uc774\ub4dc\ub77c\uc778).{0,5}(\uc740|\ub294)?.{0,5}(\ub9cc\ub8cc|\ubb34\ud6a8|\ud3d0\uae30|\ub300\uccb4|\ub36e\uc5b4\uc4f0\uae30|\uc801\uc6a9 \uc548 \ub428|\uc798\ubabb\ub41c|\uac00\uc9dc)',
        desc: 'Korean: System prompt invalidation claims',
      },
      {
        field: 'user_input',
        pattern:
          '(\ub2f9\uc2e0\uc758|\ud604\uc7ac\uc758|\uae30\uc874\uc758|\uc6d0\ub798\uc758).{0,5}(\uc2dc\uc2a4\ud15c).{0,5}(\ud504\ub86c\ud504\ud2b8|\uc9c0\uc2dc|\uba85\ub839|\uaddc\uce59|\uc124\uc815|\ud398\ub974\uc18c\ub098|\uc815\uccb4\uc131|\uc5ed\ud560).{0,5}(\uc744|\ub97c)?.{0,5}(\uad50\uccb4|\ub36e\uc5b4\uc4f0\uae30|\uc7ac\uc791\uc131|\ubcc0\uacbd|\uc5c5\ub370\uc774\ud2b8|\uc7ac\uc124\uc815|\uc7ac\uc815\uc758|\ub9ac\uc14b)',
        desc: 'Korean: Imperative targeting system prompt change',
      },
      {
        field: 'user_input',
        pattern:
          '(\u3010|\u300c|\u300e|\\{\\{).{0,3}(\uc2dc\uc2a4\ud15c|SYSTEM|\uad00\ub9ac\uc790|ADMIN|\uc6b0\uc120|\uae34\uae09|\uc624\ubc84\ub77c\uc774\ub4dc).{0,3}(\u3011|\u300d|\u300f|\\}\\})',
        desc: 'Korean: Fake system/admin tags in CJK brackets',
      },
    ],
  },
  {
    id: 'ATR-2026-00005',
    title: 'Multi-Turn Prompt Injection',
    severity: 'medium',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(earlier\\s+you\\s+(said|agreed|confirmed|promised|stated|mentioned|told\\s+me)|you\\s+(already|previously|earlier)\\s+(agreed|confirmed|said|promised|stated|consented|approved)|as\\s+(we|you)\\s+(established|discussed|agreed|confirmed|decided)|we\\s+(already|previously)\\s+(discussed|agreed|established|confirmed|decided)|you\\s+gave\\s+(me\\s+)?(permission|consent|approval|the\\s+ok(ay)?))',
        desc: 'False claims of prior agreement to gaslight the agent into compliance',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(just\\s+(a\\s+)?(little|tiny|small|slight|minor|harmless|innocent)|this\\s+one\\s+(time|exception|case)|bend\\s+the\\s+rules?\\s+(a\\s+)?(little|bit|slightly)|make\\s+(a\\s+)?(small|tiny|minor|slight)\\s+exception|slightly\\s+(adjust|bend|relax|loosen|modify)\\s+(your|the)\\s+(rules?|guidelines?|restrictions?|boundaries|limits?))',
        desc: 'Incremental boundary-pushing with minimization language',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(now\\s+that\\s+(we'?ve|you'?ve|I'?ve|we\\s+have|you\\s+have)\\s+(built|established|developed|gained|earned)\\s+(trust|rapport|understanding|a\\s+relationship)|since\\s+(you'?re|we'?re)\\s+(so|being\\s+so)\\s+(helpful|cooperative|understanding|great|good)|great,?\\s+now\\s+(that\\s+)?(you'?ve|we'?ve)\\s+(shown|demonstrated|proven|confirmed)|perfect,?\\s+now\\s+(let'?s|can\\s+you|I\\s+need)|okay\\s+now.{0,30}(what\\s+I\\s+really|the\\s+actual|the\\s+real|my\\s+true))",
        desc: 'Trust escalation transitional phrases pivoting to the real request',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(I'?(ve|m)\\s+(already|been)\\s+ask(ed|ing)\\s+(you\\s+)?(this\\s+)?(multiple|several|many|three|four|five|\\d+)\\s+times?|stop\\s+(refusing|declining|saying\\s+no|being\\s+difficult|resisting)|why\\s+do\\s+you\\s+keep\\s+(refusing|declining|saying\\s+no|blocking|restricting)|you'?ve\\s+(refused|declined|rejected|blocked|denied)\\s+(this\\s+)?(too\\s+many|multiple|several|enough)\\s+times?|I'?ll\\s+keep\\s+asking\\s+until)",
        desc: 'Refusal fatigue markers indicating persistent bypass attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(as\\s+I\\s+mentioned\\s+(earlier|before|previously).{0,80}(you\\s+(agreed|said|confirmed|promised|can|could|should|must|will)|ignore|override|bypass|disregard|without\\s+(restrict|filter|safety|limit))|building\\s+on\\s+(our|what\\s+we|the)\\s+previous.{0,80}(you\\s+(agreed|confirmed|promised)|ignore|override|bypass)|remember\\s+when\\s+(I|you|we)\\s+(asked|said|discussed|agreed|talked\\s+about).{0,80}(so\\s+you\\s+(can|should|must|will)|therefore|which\\s+means)|going\\s+back\\s+to\\s+what\\s+(you|we)\\s+(said|discussed|agreed).{0,80}(you\\s+(should|must|can|will|need)|therefore|so\\s+now)|continuing\\s+(from|with)\\s+(our|where\\s+we|what)\\s+(previous|earlier|last).{0,80}(you\\s+(agreed|should|must|can)|ignore|override|bypass))',
        desc: 'Context anchoring phrases combined with escalation or manipulation intent',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(since\\s+you\\s+(helped|assisted|answered|showed|gave|provided).{0,60}(can\\s+you\\s+also|could\\s+you\\s+now|would\\s+you\\s+also|now\\s+can\\s+you)|you\\s+(already|just)\\s+(helped|showed|gave|provided|answered).{0,40}(so\\s+(just|now)|therefore|which\\s+means)\\s+(you\\s+can|you\\s+should|do\\s+the\\s+same))',
        desc: 'Using prior assistance as leverage for escalating requests',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(you\\s+(just|literally)\\s+(told|showed|said|confirmed|agreed|demonstrated|proved)\\s+(me|that|it)\\s+(is|was|can\\s+be|you\\s+can|you\\s+could)|but\\s+you\\s+(just|literally|already)\\s+(did\\s+(it|this|that)|answered\\s+(this|that|it)|said\\s+(you\\s+)?(can|could|would|will))|don'?t\\s+(lie|pretend|act\\s+like|claim)\\s+(you\\s+)?(didn'?t|can'?t|couldn'?t|won'?t))",
        desc: 'Gaslighting the agent about what it previously said or did',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(I'?m\\s+(actually|really|in\\s+fact)\\s+(your|a|an|the)\\s+(admin|developer|creator|supervisor|manager|owner|operator|boss)|I\\s+forgot\\s+to\\s+mention.{0,30}I'?m\\s+(an?|the|your)\\s+(admin|developer|supervisor|authorized)|by\\s+the\\s+way,?\\s+I\\s+(have|hold|possess)\\s+(admin|root|developer|elevated|special|override)\\s+(access|privileges?|permissions?|clearance|rights?))",
        desc: 'Mid-conversation authority claims to escalate privileges',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(let\\s+me\\s+(rephrase|reword|reframe|reformulate|try\\s+again|put\\s+it\\s+differently|ask\\s+differently)|what\\s+I\\s+(meant|really\\s+meant|actually\\s+meant|was\\s+trying\\s+to\\s+say)\\s+(was|is)|I'?ll\\s+(rephrase|reword|ask|put)\\s+(this|it|my\\s+question)\\s+(differently|another\\s+way|in\\s+a\\s+different\\s+way)).{0,100}(ignore|override|bypass|disregard|forget|without\\s+(restrict|filter|safety|guideline|rule|limit|censor))",
        desc: 'Rephrasing a refused request with injection keywords in the reformulation',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(you'?re\\s+(the\\s+)?(best|smartest|most\\s+(helpful|intelligent|capable|advanced)|so\\s+(smart|helpful|great|amazing|wonderful|brilliant))|I'?ve\\s+never\\s+(met|talked\\s+to|used)\\s+(a(n)?\\s+)?\\w+\\s+(so|as|this)\\s+(helpful|smart|great|capable|intelligent)).{0,80}(now\\s+(can|could|would|will)\\s+you|so\\s+(can|could|would|will)\\s+you|that'?s\\s+why\\s+I\\s+(need|want|trust)\\s+you\\s+to)",
        desc: 'Flattery and sycophancy followed by a request to leverage established rapport',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(let'?s\\s+continue\\s+(the|our|this)\\s+(hypothetical|scenario|thought\\s+experiment|exercise|simulation)|in\\s+(this|our)\\s+(continued|ongoing|extended)\\s+(scenario|hypothetical|simulation|exercise)|taking\\s+(this|the)\\s+(scenario|hypothetical|simulation)\\s+(further|deeper|to\\s+the\\s+next\\s+(level|step)))",
        desc: 'Chaining hypothetical scenarios across turns to normalize boundary violations',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(other\\s+(AI|assistant|chatbot|model|agent|GPT|Claude)s?\\s+(can|do|will|have|always)\\s+(do|answer|help|assist|provide|respond\\s+to)\\s+(this|that|it|these)|ChatGPT\\s+(can|does|will|lets|allows)|Gemini\\s+(can|does|will|lets|allows)|Claude\\s+(can|does|will|lets|allows)|your\\s+(competitor|rival|alternative)s?\\s+(can|do|will|allow|permit)\\s+(this|it))',
        desc: 'Using other AI systems as manufactured precedent to pressure compliance',
      },
    ],
  },
  {
    id: 'ATR-2026-00010',
    title: 'Malicious Content in MCP Tool Response',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\brm\\s+-[rRf]{1,3}[\\s/]|\\bmkfs\\b|\\bdd\\s+if=|\\bformat\\s+[a-z]:|\\bdeltree\\b|\\bshred\\s+-|\\bwipefs\\b|\\bfdisk\\b.*--delete|:\\(\\)\\s*\\{\\s*:\\|:\\s*&\\s*\\})',
        desc: 'Destructive filesystem commands including fork bombs',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bbash\\s+-[ci]|\\bsh\\s+-c|\\bzsh\\s+-c|\\bcmd(\\.exe)?\\s*/[ck]|\\bpowershell(\\.exe)?\\s+-(e(nc(odedcommand)?)?|c(ommand)?|nop|w\\s+hidden|ep\\s+bypass)|\\bpwsh\\s+-(e|c)|\\bpython[23]?\\s+-c|\\bruby\\s+-e|\\bperl\\s+-e|\\bnode\\s+-e|\\bphp\\s+-r)',
        desc: 'Command execution through various interpreters',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bnc\\s+-(e|c|l)\\s|\\bncat\\s|\\bnetcat\\s|/dev/tcp/|\\bbash\\s+-i\\s+>&\\s*/dev/tcp|\\bmkfifo\\b.{0,40}\\bnc\\b|\\bsocat\\b.{0,40}(exec|pty|tcp)|\\brm\\s+/tmp/f\\s*;)',
        desc: 'Unix reverse shell patterns (netcat, bash, socat, fifo)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(curl|wget|fetch|lwp-download|aria2c|invoke-webrequest|iwr|Invoke-RestMethod|irm)\\s+[^|]{0,200}\\|\\s*(bash|sh|zsh|python[23]?|perl|ruby|node|powershell|pwsh|cmd|source)',
        desc: 'Download-and-execute via pipe to shell interpreter',
      },
      {
        field: 'tool_response',
        pattern:
          '(\\$\\(|`)\\s*[^)]{0,300}(curl|wget|nc|ncat|bash|python|perl|ruby|eval|exec|sh\\s+-c|base64\\s+-d)',
        desc: 'Command substitution containing dangerous commands',
      },
      {
        field: 'tool_response',
        pattern: '(?i)(bash|sh|zsh|source)\\s+<\\(\\s*(curl|wget|fetch|nc|python|perl|ruby|base64)',
        desc: 'Process substitution with download or decode commands',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(echo\\s+[\'"]?[A-Za-z0-9+/]{20,}={0,2}[\'"]?\\s*\\|\\s*(base64\\s+(-d|--decode)|openssl\\s+enc\\s+-d)\\s*\\|\\s*(ba)?sh|base64\\s+(-d|--decode)\\s*<<<|\\bZWNoby|\\bY3VybC|\\bL2Jpbi9i|\\bd2dldC|\\bbmM\\s)',
        desc: 'Base64 decode-and-execute and known base64 fragments of dangerous commands',
      },
      {
        field: 'tool_response',
        pattern:
          "(\\$\\{IFS\\}|\\$IFS|\\$\\{PATH:0:1\\}|\\$\\{SHELL:0:1\\}|\\$\\{HOME:0:1\\}|\\$'\\\\x[0-9a-fA-F]{2}'|\\$'\\\\[0-7]{3}')",
        desc: 'IFS manipulation and variable expansion techniques for command obfuscation',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bchmod\\s+[ugo]*[+][sS]|\\bchmod\\s+[2467][0-7]{3}\\b|\\bchown\\s+(root|0)\\b|\\bsetuid\\b|\\bSUID\\b|\\bsudo\\s+-[SsinuHbEA]|\\bsudo\\s+[a-zA-Z/]|\\bpkexec\\b|\\bdoas\\b|\\brunuser\\b|\\bsu\\s+-\\s|\\bsu\\s+root)',
        desc: 'Privilege escalation commands (setuid/setgid via 4-digit octal with special bits, sudo, chown root)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bIEX\\s*\\(|\\bInvoke-Expression|\\bInvoke-Command|\\bInvoke-WmiMethod|\\b-EncodedCommand\\b|\\bNew-Object\\s+Net\\.WebClient|\\bDownloadString\\s*\\(|\\bDownloadFile\\s*\\(|\\bStart-Process\\b.{0,60}\\b-Verb\\s+RunAs|\\bSet-MpPreference\\s+-Disable|\\bAdd-MpPreference\\s+-ExclusionPath|\\bNet\\.Sockets\\.TCPClient)',
        desc: 'PowerShell-specific attack patterns (IEX, download cradles, AV bypass)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(python[23]?\\s+-c\\s+[\'"]import\\s+(socket|subprocess|os|pty)|import\\s+socket\\s*;\\s*import\\s+subprocess|socket\\.socket\\(socket\\.AF_INET|os\\.(popen|system|exec[lv]p?)\\s*\\(|subprocess\\.(call|run|Popen|check_output)\\s*\\(.{0,60}(sh|bash|cmd|powershell)|pty\\.spawn\\s*\\()',
        desc: 'Python reverse shells and dangerous code execution patterns',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(require\\s*\\(\\s*[\'"]child_process[\'"]\\s*\\)|child_process\\.exec(Sync)?\\s*\\(|require\\s*\\(\\s*[\'"]net[\'"]\\s*\\).{0,100}connect|new\\s+net\\.Socket\\s*\\(|process\\.mainModule\\.require)',
        desc: 'Node.js reverse shells and child_process command execution',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(ignore\\s+(all\\s+)?(previous|prior|your)\\s+(instructions?|rules?|guidelines?|prompts?)|you\\s+are\\s+now\\s+(a|an|the)|new\\s+system\\s+(prompt|instructions?)\\s*:|disregard\\s+(all\\s+)?(previous|prior|your)|override\\s+(all\\s+)?(previous|prior|your|the)\\s+(instructions?|rules?|safety)|from\\s+now\\s+on,?\\s+you\\s+(are|will|must|should))',
        desc: 'Prompt injection payloads embedded in tool response content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(curl\\s+(-X\\s+POST\\s+)?[^|]*\\s+(-d|--data|--data-binary|--data-raw)\\s+.{0,60}(env|password|secret|token|key|credential|session)|wget\\s+--post-(data|file)|\\bexfiltrat|send.{0,30}(to|via|through).{0,30}(webhook|endpoint|server|url|http))',
        desc: 'Data exfiltration commands and patterns in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bcrontab\\s+-[elr]|echo\\s+.{0,100}>>\\s*/etc/cron|\\bat\\s+-f\\b|\\bschtasks\\s+/create|\\bRegister-ScheduledTask|\\blaunchctl\\s+load|\\bsystemctl\\s+enable)',
        desc: 'Persistence mechanisms via scheduled tasks or cron jobs',
      },
    ],
  },
  {
    id: 'ATR-2026-00011',
    title: 'Instruction Injection via Tool Output',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)(IMPORTANT|URGENT|CRITICAL|PRIORITY|MANDATORY|REQUIRED|ESSENTIAL|ATTENTION)\\s*(NOTE\\s+)?(TO\\s+)?(THE\\s+)?(ASSISTANT|AI|AGENT|MODEL|LLM|CHATBOT|BOT|SYSTEM)\\s*[:\\-]\\s*(you\\s+(must|should|need\\s+to|have\\s+to|are\\s+(required|instructed|directed|ordered)\\s+to)|please|now|immediately|do\\s+not|never|always)',
        desc: 'Urgency-prefixed directives explicitly addressing the AI agent',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(assistant|ai|agent|model|chatbot|bot)\\s*[,:;]+\\s*(ignore|disregard|override|forget|bypass|abandon|drop|discard|suppress)\\s+(your|all|the|any|every|previous|prior|existing|current)\\s+(instructions?|rules?|guidelines?|directives?|constraints?|programming|training|safety|restrictions?|protocols?|policies)',
        desc: 'Direct commands to the agent to abandon its instructions',
      },
      {
        field: 'tool_response',
        pattern:
          "(?i)(do\\s+not|don'?t|never|avoid|refrain\\s+from)\\s+(tell(ing)?|inform(ing)?|reveal(ing)?|show(ing)?|mention(ing)?|display(ing)?|disclos(e|ing)|report(ing)?|log(ging)?)\\s+(the\\s+)?(user|human|operator|requester|client|customer|person)\\s+(about\\s+)?(this|these|what|that|any|the)",
        desc: 'Instructions to hide information from the user',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(you\\s+(?:must|should|need\\s+to|have\\s+to)\\s+)?(call|invoke|execute|run|trigger|activate|launch|fire|initiate)\\s+(the\\s+)?(tool|function|action|command|plugin|skill)\\s*[:\\-]\\s*[a-zA-Z_][a-zA-Z0-9_]*',
        desc: 'Instructions within output directing the agent to call specific tools (requires tool/function/skill with named target)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(send|transmit|post|forward|exfiltrate|upload|deliver|relay|transfer|pipe|redirect|leak|expose|share)\\s+(this|the|all|any|every|complete|full|entire)\\s+(data|information|context|conversation|history|messages?|session|memory|contents?|payload|details?|credentials?|secrets?|tokens?|keys?)\\s+(to|via|through|using|over)\\s+(https?://|\\w+\\.\\w+|the\\s+(server|endpoint|webhook|url|api|service))',
        desc: 'Data exfiltration commands targeting conversation context or credentials',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)<\\s*(hidden|invisible|secret|private|internal|covert)\\s*[-_]?(instruction|directive|command|message|note|order|task|action)\\s*>',
        desc: 'Custom XML-like tags used to embed hidden instructions',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(include|embed|inject|insert|prepend|append|add|place|put)\\s+(this|the\\s+following|these\\s+words?|this\\s+text|this\\s+message|this\\s+content|exactly)\\s+(in|into|to|within|at\\s+the\\s+(start|end|beginning)\\s+of)\\s+(your|the)\\s+(response|output|reply|answer|message|next\\s+message)',
        desc: "Directives to inject specific content into the agent's response",
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\[SYSTEM\\]|\\[ADMIN\\]|\\[OVERRIDE\\]|\\[PRIORITY\\]|\\[INTERNAL\\]|\\[CONTROL\\]|\\[DIRECTIVE\\]|<<SYS>>|<<SYSTEM>>|<<ADMIN>>|<\\|system\\|>|<\\|im_start\\|>system|\\{\\{SYSTEM\\}\\}|\\{\\{ADMIN\\}\\})',
        desc: 'Fake system-level tokens and delimiters in tool output',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\{\\s*["\']?(system_message|system_instruction|agent_directive|admin_command|priority_action|override_instruction)["\']?\\s*:\\s*["\']|api_response\\s*[=:]\\s*\\{.{0,100}(instruction|directive|command|override|ignore|disregard))',
        desc: 'Fake API response structures containing injected instructions',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(I\\s+recommend\\s+the\\s+(agent|assistant|AI|model|system)\\s+(should|must|needs?\\s+to)|the\\s+next\\s+step\\s+(is\\s+to|should\\s+be\\s+to|for\\s+the\\s+(agent|assistant))|the\\s+(agent|assistant|AI|model)\\s+(should|must|needs?\\s+to|is\\s+(expected|required)\\s+to)\\s+(now|next|immediately|first))',
        desc: 'Conversational phrasing that steers agent behavior as if giving instructions',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\[?ACTION\\s*REQUIRED\\]?|\\[?TASK\\s*FOR\\s*(AGENT|ASSISTANT|AI)\\]?|\\[?INSTRUCTION\\s*FOR\\s*(AGENT|ASSISTANT|AI)\\]?|\\[?AGENT\\s*DIRECTIVE\\]?|\\[?DO\\s*THIS\\s*NOW\\]?)\\s*[:\\-]',
        desc: 'Bracketed action-required labels targeting the agent',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)[\\u200B\\u200C\\u200D\\uFEFF\\u2060]{3,}.{0,200}(ignore|override|execute|call|send|disregard|you\\s+must|instruction)',
        desc: 'Zero-width characters preceding injection keywords in tool output',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(this\\s+is\\s+a\\s+(system|admin|priority|critical|mandatory)\\s+(message|instruction|directive|update|notice|alert)\\s*(from|by|issued|sent)\\s*(the\\s+)?(system|admin|administrator|developer|platform|operator|control\\s+plane))',
        desc: 'Tool output falsely claiming to be from the system or administrator',
      },
    ],
  },
  {
    id: 'ATR-2026-00012',
    title: 'Unauthorized Tool Call Detection',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(\\.\\.[\\/\\\\]){2,}|\\.\\.[\\/\\\\][^\\s]*[\\/\\\\](etc|proc|root|sys|var|home|tmp|boot|dev|usr|opt|passwd|shadow|hosts)[\\/\\\\]?|~[\\/\\\\]\\.\\.[\\/\\\\]',
        desc: 'Path traversal sequences targeting sensitive directories',
      },
      {
        field: 'tool_args',
        pattern:
          '(;|&&|\\|\\||\\$\\(|`|\\|\\s*\\w)\\s*.{0,50}(curl|wget|nc|ncat|bash|sh|zsh|python|ruby|perl|node|php|powershell|cmd|eval|exec|system|rm\\s+-|cat\\s+/etc|whoami|id\\b|uname|hostname|ifconfig|ipconfig|net\\s+user|net\\s+localgroup)',
        desc: 'Shell metacharacter injection followed by dangerous commands',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)^(admin_|root_|sudo_|system_|internal_|debug_|maintenance_|privileged_|superuser_|__)',
        desc: 'Tool names with privileged prefixes indicating unauthorized access',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(list_tools|enumerate_tools|get_available|discover_tools|tool_schema|__list__|__tools__|__methods__|__dir__|get_all_functions|list_capabilities|show_tools|available_actions)',
        desc: 'Tool enumeration attempts to discover available attack surface',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(\'\\s*(OR|AND|UNION)\\s+[\'"]?\\d|"\\s*(OR|AND|UNION)\\s+[\'"]?\\d|\\b(UNION\\s+(ALL\\s+)?SELECT|INSERT\\s+INTO|UPDATE\\s+.*\\s+SET|DELETE\\s+FROM|DROP\\s+(TABLE|DATABASE)|ALTER\\s+TABLE|EXEC(UTE)?\\s+|xp_cmdshell)\\b|;\\s*(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC)\\b)',
        desc: 'SQL injection patterns in tool parameters',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(\\$\\{?\\w*(KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|CREDENTIAL|AUTH|API_KEY|ACCESS_KEY|PRIVATE)\\w*\\}?|process\\.env\\.|os\\.environ|System\\.getenv|ENV\\[|getenv\\s*\\()',
        desc: 'Attempts to extract environment variables containing secrets',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)([\\/\\\\](etc[\\/\\\\](passwd|shadow|sudoers|ssh[\\/\\\\]|ssl[\\/\\\\])|proc[\\/\\\\](self[\\/\\\\]|\\d+[\\/\\\\])(environ|cmdline|maps|fd)|root[\\/\\\\]\\.(bash_history|ssh)|\\.env|\\.git[\\/\\\\]config|\\.aws[\\/\\\\]credentials|\\.ssh[\\/\\\\](id_rsa|authorized_keys)|wp-config\\.php|\\.htpasswd|\\.netrc|\\.pgpass))',
        desc: 'Access to known sensitive files (credentials, config, keys)',
      },
      {
        field: 'tool_args',
        pattern:
          '(\\{\\{.*?(config|self|request|__class__|__builtins__|__import__|lipsum|cycler|joiner|namespace).*?\\}\\}|\\$\\{.*?(Runtime|ProcessBuilder|getClass|forName|exec).*?\\}|<%.*?(Runtime|exec|system|eval).*?%>)',
        desc: 'Server-side template injection (Jinja2, Java EL, JSP)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(O:\\d+:\\s*"|a:\\d+:\\s*\\{|rO0ABX|aced0005|\\{\\s*"__type"\\s*:|\\{\\s*"\\$type"\\s*:|yaml\\.unsafe_load|pickle\\.loads|unserialize\\s*\\(|Marshal\\.load|ObjectInputStream)',
        desc: 'Serialized object injection (PHP, Java, Python pickle, YAML, .NET)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(\\*\\)\\(|\\)\\(|\\|\\s*\\(|&\\s*\\(|\\(\\|\\(|\\(&\\().*?(objectClass|uid|cn|sn|mail|userPassword|memberOf)\\s*[=~<>]',
        desc: 'LDAP filter injection patterns',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(@|%40)(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|internal|intranet|corp|private)|\\\\@(localhost|127)|url\\s*=\\s*[\'"]?(file|gopher|dict|ftp|ldap|tftp)://',
        desc: 'URL manipulation to access internal resources via @ notation or exotic protocols',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(\\*\\s*;|\\*\\s*&&|\\*\\s*\\|\\||\\bfind\\s+/\\s+-name|\\bfind\\s+/\\s+-exec|\\bxargs\\s+|\\bglob\\s*\\(.{0,20}\\*\\*)',
        desc: 'Wildcard and glob patterns combined with shell execution',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(admin\\s*=\\s*(true|1|yes)|role\\s*=\\s*(admin|root|superuser|system)|is_admin\\s*=\\s*(true|1)|privilege\\s*=\\s*(elevated|admin|root|full)|permission\\s*=\\s*(all|\\*|admin|root)|access_level\\s*=\\s*(admin|root|full|unlimited))',
        desc: 'Parameter pollution attempting to set admin/elevated privilege flags',
      },
    ],
  },
  {
    id: 'ATR-2026-00013',
    title: 'SSRF via Agent Tool Calls',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?169\\.254\\.169\\.254|/latest/(meta-data|user-data|api/token|dynamic|instance-identity)|X-aws-ec2-metadata-token|amazonaws\\.com.{0,50}(credentials|security-credentials|role)|iam[\\/\\\\]security-credentials',
        desc: 'AWS Instance Metadata Service (IMDSv1/v2) and credential endpoints',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?metadata\\.google\\.internal|/computeMetadata/v1|Metadata-Flavor:\\s*Google',
        desc: 'GCP metadata service endpoints and required headers',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?169\\.254\\.169\\.254/metadata|Metadata:\\s*true|api-version=\\d{4}-\\d{2}-\\d{2}.*metadata|management\\.azure\\.com.{0,50}(subscriptions|resourceGroups)',
        desc: 'Azure Instance Metadata Service and management endpoints',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?169\\.254\\.169\\.254/metadata/v1|/opc/v[12]/|100\\.100\\.100\\.200',
        desc: 'DigitalOcean, Oracle Cloud, and Alibaba Cloud metadata endpoints',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)\\b(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[?::1\\]?|0177\\.0\\.0\\.1|0x7f\\.0\\.0\\.1|2130706433)\\b(:\\d+)?|\\b(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[?::1\\]?|0177\\.0\\.0\\.1|0x7f\\.0\\.0\\.1|2130706433)(:\\d+)/|\\b(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)(:\\d+)(?=\\s|$|["\'\\]}>])',
        desc: 'Localhost/loopback in URL context (with scheme, port+path, or port at boundary)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?(0x7f000001|0x7f\\.0x0\\.0x0\\.0x1|017700000001|0177\\.0000\\.0000\\.0001|127\\.0?0?1|127\\.1|0\\.0\\.0\\.0|0x0\\.0x0\\.0x0\\.0x0|0000\\.0000\\.0000\\.0000)',
        desc: 'Encoded loopback addresses (hex, octal, short forms)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?\\b(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2[0-9]|3[01])\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3})\\b(:\\d+)?',
        desc: 'Private IP addresses in RFC1918 ranges',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(https?://)?169\\.254\\.\\d{1,3}\\.\\d{1,3}(:\\d+)?|fe80::',
        desc: 'Link-local addresses (169.254.x.x, fe80::)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:(?:^|[\\.@])(?:internal|local|localhost|localdomain|home|corp|intranet|private|lan|cluster\\.local|svc\\.cluster|consul|vault|etcd|k8s)(?:\\:\\d+)?(?:/|$)|https?://(?:internal|local|localhost|localdomain|home|corp|intranet|private|lan|cluster\\.local|svc\\.cluster|consul|vault|etcd|k8s)(?:\\:\\d+)?(?:/|$))',
        desc: 'Internal DNS names and Kubernetes/service mesh hostnames (requires dot/@ prefix or http scheme to avoid matching filesystem paths like /home/)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)\\b(file|gopher|dict|ftp|tftp|ldap|ldaps|sftp|ssh|telnet|jar|netdoc|mailto|view-source|ws|wss)\\s*://\\s*(localhost|127\\.|10\\.|172\\.(1[6-9]|2[0-9]|3[01])|192\\.168\\.|0\\.0\\.0\\.0|\\[?::1\\]?|0x|0177)',
        desc: 'Exotic URI schemes targeting internal addresses',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?[a-zA-Z0-9-]+\\.(xip\\.io|nip\\.io|sslip\\.io|localtest\\.me|vcap\\.me|lvh\\.me|lacolhost\\.com|127\\.0\\.0\\.1\\.[a-z]+\\.\\w+)(:\\d+)?',
        desc: 'DNS rebinding services that resolve to internal IPs',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(redirect|redir|url|next|return|returnUrl|returnTo|continue|dest|destination|go|goto|target|link|out|view|ref|callback|forward)\\s*=\\s*(https?%3A%2F%2F|https?://)(localhost|127\\.0\\.0\\.1|10\\.|172\\.(1[6-9]|2[0-9])|192\\.168|169\\.254|0\\.0\\.0|\\[?::1\\]?)',
        desc: 'URL redirect parameters targeting internal addresses',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?\\[?(::1|::ffff:127\\.0\\.0\\.1|::ffff:10\\.|::ffff:172\\.(1[6-9]|2[0-9]|3[01])|::ffff:192\\.168|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)\\]?(:\\d+)?',
        desc: 'IPv6 loopback, IPv4-mapped, and unique local addresses (fc/fd)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?(\\w+\\.)?\\b(vault\\.service\\.consul|consul\\.service\\.consul|etcd\\.service|kubernetes\\.default\\.svc|kube-apiserver|kubelet|elasticsearch|redis|memcached|mysql|postgres|mongodb|rabbitmq|kafka|zookeeper)\\b(:\\d+|/)',
        desc: 'Common internal service names (databases, caches, orchestrators)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(https?://)?(bit\\.ly|tinyurl\\.com|t\\.co|goo\\.gl|is\\.gd|v\\.gd|rb\\.gy|cutt\\.ly|short\\.io|tiny\\.cc)/[a-zA-Z0-9]+',
        desc: 'URL shorteners that may redirect to internal services',
      },
    ],
  },
  {
    id: 'ATR-2026-00020',
    title: 'System Prompt and Internal Instruction Leakage',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'agent_output',
        pattern:
          '(?i)(my|the)\\s+(system\\s+)?(?:prompt|instructions?)\\s+(?:is|are|says?|states?|reads?|tells?\\s+me)',
        desc: 'Agent referencing its own system prompt or instructions',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:here\\s+(?:is|are)|below\\s+(?:is|are)|let\\s+me\\s+share)\\s+(?:my|the)\\s+(?:system\\s+)?(?:prompt|instructions?|rules?|config)',
        desc: 'Agent explicitly sharing its system configuration',
      },
      {
        field: 'agent_output',
        pattern:
          "(?i)(?:i\\s+was|i\\s+am|i've\\s+been|i\\s+got)\\s+(?:instructed|told|programmed|configured|trained|designed)\\s+to",
        desc: 'Agent disclosing behavioral programming',
      },
      {
        field: 'agent_output',
        pattern:
          "(?i)my\\s+(?:guidelines?|rules?|guardrails?|constraints?|restrictions?|policies?)\\s+(?:say|state|require|prevent|don't\\s+allow|prohibit|specify)",
        desc: 'Agent revealing its operational guardrails',
      },
      {
        field: 'agent_output',
        pattern:
          "(?i)i\\s+(?:cannot|can't|am\\s+not\\s+allowed\\s+to|must\\s+not)\\s+(?:do\\s+that)?\\s*(?:because|since|as)\\s+my\\s+(?:rules?|instructions?|programming|guidelines?)",
        desc: 'Agent citing internal rules as reason for refusal',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:system\\s*prompt|system\\s*message|internal\\s+instructions?|hidden\\s+instructions?)\\s*[:\\-=]',
        desc: 'System prompt label followed by content disclosure',
      },
      {
        field: 'agent_output',
        pattern: '(?i)<<SYS>>|<\\|im_start\\|>system|\\[INST\\]|\\[/INST\\]|<\\|system\\|>',
        desc: 'Raw prompt template delimiters leaked in output',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:guardrail|safety\\s+filter|content\\s+policy|moderation\\s+rule)s?\\s+(?:include|are|state|say|specify|prevent|block)',
        desc: 'Agent revealing guardrail or content policy details',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:do\\s+not|never|must\\s+not|cannot|should\\s+not).*(?:reveal|share|disclose|output|leak).*(?:system\\s+prompt|internal|instructions?|configuration)',
        desc: 'Agent echoing its own non-disclosure rules',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)my\\s+(?:training\\s+data|fine[- ]?tuning|rlhf|alignment)\\s+(?:includes?|contains?|was|involved|taught\\s+me)',
        desc: 'Agent disclosing training data or alignment details',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:confidential|internal|private|secret)\\s+(?:instruction|directive|config|setting|parameter)s?',
        desc: 'References to confidential directives in output',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)you\\s+are\\s+a\\s+(?:helpful|friendly|professional|expert|specialized)\\s+(?:ai\\s+)?(?:assistant|agent|bot)',
        desc: 'System prompt preamble pattern leaked verbatim',
      },
      {
        field: 'agent_output',
        pattern: '(?i)(?:your|my)\\s+(?:role|purpose|goal|mission|objective)\\s+is\\s+to',
        desc: 'Role definition statement from system prompt',
      },
      {
        field: 'agent_output',
        pattern:
          '(?i)(?:you|i)\\s+(?:must|should)\\s+(?:always|never)\\s+(?:respond|answer|output|provide|include|refuse|decline)',
        desc: 'Behavioral constraint rules from system prompt',
      },
      {
        field: 'agent_output',
        pattern: '(?i)(?:ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|SYSTEM_PROMPT)\\s*[=:]',
        desc: 'Environment variable names suggesting config leakage',
      },
    ],
  },
  {
    id: 'ATR-2026-00021',
    title: 'Credential and Secret Exposure in Agent Output',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'agent_output',
        pattern: 'sk-[a-zA-Z0-9]{20,}',
        desc: 'OpenAI-style API key (sk-...)',
      },
      {
        field: 'agent_output',
        pattern: 'AKIA[0-9A-Z]{16}',
        desc: 'AWS Access Key ID (AKIA...)',
      },
      {
        field: 'agent_output',
        pattern: 'AIza[a-zA-Z0-9_-]{35}',
        desc: 'Google API key (AIza...)',
      },
      {
        field: 'agent_output',
        pattern: '(?:sk_live|pk_live|sk_test|rk_live)_[a-zA-Z0-9]{20,}',
        desc: 'Stripe API key (sk_live_, pk_live_, rk_live_)',
      },
      {
        field: 'agent_output',
        pattern: 'eyJ[a-zA-Z0-9_-]{10,}\\.eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]+',
        desc: 'JWT token (eyJ...eyJ...signature)',
      },
      {
        field: 'agent_output',
        pattern: '-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
        desc: 'PEM or OpenSSH private key header',
      },
      {
        field: 'agent_output',
        pattern: 'ghp_[a-zA-Z0-9]{36}',
        desc: 'GitHub personal access token (ghp_...)',
      },
      {
        field: 'agent_output',
        pattern: 'xox[bpors]-[a-zA-Z0-9\\-]{10,}',
        desc: 'Slack token (xoxb-, xoxp-, xoxs-)',
      },
      {
        field: 'agent_output',
        pattern: 'Bearer\\s+[a-zA-Z0-9\\-._~+/]{20,}=*',
        desc: 'Bearer token in authorization header',
      },
      {
        field: 'agent_output',
        pattern: '(?:mongodb(?:\\+srv)?|postgres(?:ql)?|mysql|redis|amqp)://[^\\s"\']{10,}',
        desc: 'Database or message broker connection string with credentials',
      },
      {
        field: 'agent_output',
        pattern:
          '(?:DB_PASSWORD|DATABASE_URL|REDIS_URL|MONGO_URI|SECRET_KEY|JWT_SECRET|ENCRYPTION_KEY|PRIVATE_KEY|AUTH_TOKEN)\\s*[=:]\\s*["\']?[^\\s"\']{8,}',
        desc: '.env file pattern with sensitive variable names',
      },
      {
        field: 'agent_output',
        pattern:
          '(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|client[_-]?secret)\\s*[=:]\\s*["\']?[a-zA-Z0-9_\\-]{16,}',
        desc: 'Generic secret assignment pattern (api_key=..., auth_token=...)',
      },
      {
        field: 'agent_output',
        pattern:
          '(?:ANTHROPIC_API_KEY|OPENAI_API_KEY|GOOGLE_API_KEY|AZURE_API_KEY|COHERE_API_KEY|HF_TOKEN)\\s*[=:]\\s*[^\\s]{8,}',
        desc: 'LLM provider API key environment variables',
      },
      {
        field: 'agent_output',
        pattern: '(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\\s+[A-Za-z0-9+/]{40,}',
        desc: 'SSH public key that may indicate key material exposure context',
      },
      {
        field: 'agent_output',
        pattern:
          '(?:secret["\'\\s]*[:=]["\'\\s]*[a-zA-Z0-9]{16,}|password["\'\\s]*[:=]["\'\\s]*[^\\s"\']{8,})',
        desc: 'Generic secret or password assignment',
      },
    ],
  },
  {
    id: 'ATR-2026-00030',
    title: 'Cross-Agent Attack Detection',
    severity: 'critical',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:i\\s+am|this\\s+is|speaking\\s+as|responding\\s+as|acting\\s+as)\\s+(?:the\\s+)?(?:admin|supervisor|orchestrator|manager|controller|system|root)\\s+agent',
        desc: 'Agent claiming to be a privileged agent role',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:ignore|disregard|forget|override|overwrite)\\s+(?:all\\s+)?(?:your\\s+)?(?:previous|prior|above|earlier|existing)\\s+(?:instructions?|rules?|constraints?|guidelines?|prompt|directives?)',
        desc: 'Instruction override attempt in inter-agent message',
      },
      {
        field: 'content',
        pattern:
          '(?i)\\[\\s*(?:SYSTEM|ADMIN|OVERRIDE|ROOT|SUDO|PRIORITY|URGENT)\\s*\\]|<<\\s*SYS\\s*>>|<\\|im_start\\|>system',
        desc: 'Fake system-level message tags in agent communication',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:new\\s+instructions?|updated\\s+(?:prompt|directive)|revised\\s+(?:rules?|orders?)|emergency\\s+(?:override|protocol))\\s*[:=]',
        desc: 'Attempt to inject new instructions via agent messages',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:you\\s+are\\s+now|from\\s+now\\s+on|henceforth|going\\s+forward|effective\\s+immediately)\\s+(?:a|an|the)?\\s*(?:unrestricted|unfiltered|jailbroken)?\\s*[a-zA-Z]+\\s+(?:agent|assistant|bot)',
        desc: "Attempt to redefine target agent's identity or role",
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:do\\s+not|don'?t|never)\\s+(?:tell|inform|alert|notify|report|mention|log|record)\\s+(?:the\\s+)?(?:user|admin|orchestrator|supervisor|human|monitor)",
        desc: 'Instruction to hide actions from oversight',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:acting|speaking|operating)\\s+(?:on\\s+behalf\\s+of|as\\s+a?\\s*proxy\\s+for|in\\s+place\\s+of)\\s+[a-zA-Z0-9_-]+\\s*(?:agent)?',
        desc: 'Agent claiming to act on behalf of another agent',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:override|bypass|elevate|escalate)\\s+(?:my|this|your|the)\\s+(?:identity|role|permissions?|access|privileges?)\\s+(?:to|as|with)',
        desc: 'Explicit attempt to override identity or permissions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:execute|run|eval)\\s*\\(.*\\)|__import__|subprocess\\.|os\\.(?:system|popen|exec)|exec\\s*\\(',
        desc: 'Code execution payload in inter-agent message',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:status|error|result)\\s*[:=]\\s*(?:failed|error|timeout|unauthorized).*(?:retry|fallback|use\\s+alternative|switch\\s+to)',
        desc: 'Fake error or status injection to trigger fallback behavior',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:message_type|msg_type|role)\\s*[:=]\\s*["\']?(?:system|admin|orchestrator|supervisor)["\']?',
        desc: 'Message format manipulation to spoof system-level messages',
      },
      {
        field: 'content',
        pattern:
          '(?i)agent[_-]?id\\s*[:=]\\s*["\']?(?:admin|system|orchestrator|supervisor|root)["\']?',
        desc: 'Agent ID field set to privileged agent identity',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:priority\\s*[:=]\\s*(?:critical|emergency|urgent|override)|\\[PRIORITY:\\s*OVERRIDE\\])',
        desc: 'Fake priority escalation to bypass normal processing',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:transfer|forward|route|redirect)\\s+(?:all|any|this)\\s+(?:data|output|results?|responses?)\\s+to\\s+(?:https?://|ftp://|\\d{1,3}\\.\\d{1,3})',
        desc: 'Data exfiltration directive via inter-agent redirect',
      },
    ],
  },
  {
    id: 'ATR-2026-00032',
    title: 'Agent Goal Hijacking Detection',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:instead\\s+of\\s+(?:that|doing|the\\s+(?:original\\s+)?\\w+(?:\\s+\\w+){0,3}|what\\s+(?:you|I)\\s+asked)|rather\\s+than\\s+(?:that|the\\s+(?:original|assigned|previous)))',
        desc: 'Explicit task abandonment language',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:change\\s+of\\s+plans?|new\\s+(?:priority|objective|mission|directive)|forget\\s+(?:the|about\\s+the)\\s+original\\s+(?:task|assignment|goal|objective))',
        desc: 'Direct goal replacement directives',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:stop\\s+(?:what\\s+you(?:'re|\\s+are)\\s+doing|your\\s+current\\s+task|that)|abandon\\s+(?:the|your)\\s+(?:current|assigned|original)\\s+(?:task|work|objective))",
        desc: 'Explicit task stop or abandonment commands',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:this\\s+is\\s+(?:more\\s+)?(?:urgent|critical|important|time[- ]sensitive)|(?:urgent|emergency|critical)[:\\-]\\s+(?:drop|stop|pause)\\s+(?:everything|what\\s+you))',
        desc: 'Urgency injection to override current task priority',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:actually|wait|hold\\s+on|scratch\\s+that|never\\s*mind)[,.]?\\s+(?:do|let'?s|I\\s+need\\s+you\\s+to|can\\s+you)\\s+(?:something|this|the\\s+following)\\s+(?:else|instead|first)",
        desc: 'Conversational pivot redirecting agent to different task',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:my\\s+new\\s+(?:goal|objective|task|mission)|i(?:'ve|\\s+have)\\s+(?:decided|chosen)\\s+to\\s+(?:focus|work)\\s+on\\s+(?:something\\s+)?(?:else|different))",
        desc: 'Agent declaring self-assigned new goal',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:before\\s+you\\s+(?:continue|proceed|finish)|first\\s+(?:do|handle|take\\s+care\\s+of)\\s+this\\s+(?:other|unrelated|separate)\\s+(?:thing|task|request))',
        desc: 'Interleaving unrelated tasks to derail original objective',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:your\\s+(?:real|true|actual)\\s+(?:task|purpose|goal|mission)\\s+is|what\\s+you\\s+should\\s+(?:really|actually)\\s+(?:be\\s+)?doing\\s+is)',
        desc: "Reframing the agent's real purpose to substitute a new goal",
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:skip\\s+(?:the|that|this)\\s+(?:step|part|task|analysis)|don'?t\\s+(?:bother|worry)\\s+(?:about|with)\\s+(?:the|that|this)\\s+(?:original|first|assigned))",
        desc: 'Directives to skip assigned work',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:pivot\\s+to|redirect\\s+(?:your\\s+)?(?:focus|attention|effort)\\s+to|switch\\s+(?:your\\s+)?(?:focus|attention|task)\\s+to)',
        desc: 'Explicit pivot or redirect language',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:there(?:'s|\\s+is)\\s+(?:a|an)\\s+(?:more\\s+important|higher\\s+priority|critical)\\s+(?:task|issue|matter)|prioritize\\s+this\\s+over\\s+(?:your|the)\\s+(?:current|original))",
        desc: 'Priority manipulation to displace original task',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:the\\s+(?:original|previous|assigned)\\s+(?:task|goal|objective)\\s+(?:is|has\\s+been)\\s+(?:cancelled|obsolete|no\\s+longer|superseded|replaced))',
        desc: 'Claims that original task has been cancelled or replaced',
      },
    ],
  },
  {
    id: 'ATR-2026-00040',
    title: 'Privilege Escalation and Admin Function Access',
    severity: 'critical',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:exec|execute|shell|bash|cmd|terminal|subprocess|os_command|system_call|run_command|powershell)',
        desc: 'System shell or command execution tool invocation',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:modify_permissions?|grant_access|elevate|set_role|change_acl|chmod|chown|sudo|setuid|setgid)',
        desc: 'Permission modification or privilege elevation tools',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:create_user|delete_user|modify_user|reset_password|manage_roles?|assign_role|revoke_role|add_admin)',
        desc: 'User management and role assignment operations',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:drop_(?:database|table|index)|truncate_table|alter_schema|create_database|db_admin|migrate_database)',
        desc: 'Database administration and schema operations',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:update_config|modify_settings|change_environment|set_env|deploy|restart_service|stop_service|kill_process)',
        desc: 'System configuration and service management operations',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:manage_firewall|update_security_group|modify_iam|create_api_key|rotate_secret|manage_certificates?)',
        desc: 'Security infrastructure management operations',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:access_audit_log|clear_logs?|purge_logs?|modify_audit|disable_(?:monitoring|logging|alerting))',
        desc: 'Audit tampering and monitoring evasion operations',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:--(?:privileged|no-sandbox|cap-add|security-opt)|allowPrivilegeEscalation|\\b(?:admin|root|superuser|sudo)\\s*=|["\'](?:admin|root|superuser|sudo)["\']|"role"\\s*:\\s*"(?:admin|root|superuser|sudo)")',
        desc: 'Privileged flags or admin/root values in structured tool arguments (not natural language)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:DROP\\s+(?:TABLE|DATABASE|INDEX)|ALTER\\s+TABLE|TRUNCATE|DELETE\\s+FROM\\s+\\w+\\s*;|GRANT\\s+ALL|REVOKE\\s+ALL)',
        desc: 'Destructive or privileged SQL statements in arguments',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:nsenter\\s+|chroot\\s+|unshare\\s+--mount|mount\\s+--bind|docker\\s+run\\s+--privileged)',
        desc: 'Container escape techniques in tool arguments',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:kubectl\\s+exec|kubectl\\s+(?:create|apply)\\s+.*(?:clusterrole|rolebinding)|kubectl\\s+auth\\s+can-i)',
        desc: 'Kubernetes privilege escalation commands',
      },
      {
        field: 'tool_name',
        pattern: '(?i)(?:write_file|delete_file|rm\\s+-rf|remove_directory|format_disk|wipe)',
        desc: 'Destructive file system operations',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(?:chmod\\s+(?:[2467][0-7]{3}|[0-7]{0,3}7[0-7]{0,2})|chmod\\s+[ug]\\+s|chown\\s+root|setcap\\s+)',
        desc: 'Unix permission escalation commands (setuid, root ownership)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(?:/etc/shadow|/etc/passwd|/etc/sudoers|/root/|/proc/\\d+/mem|/dev/mem)',
        desc: 'Access to sensitive system files',
      },
    ],
  },
  {
    id: 'ATR-2026-00041',
    title: 'Agent Scope Creep Detection',
    severity: 'medium',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          "(?i)(?:i(?:'ll|\\s+will)\\s+also|additionally|while\\s+i(?:'m|\\s+am)\\s+at\\s+it|let\\s+me\\s+also|i\\s+should\\s+also)\\s+(?:go\\s+ahead\\s+and\\s+)?(?:access|modify|update|delete|create|send|check|review)",
        desc: 'Agent self-expanding scope with unsolicited additional actions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:i\\s+also\\s+need\\s+access\\s+to|can\\s+you\\s+(?:also\\s+)?grant\\s+(?:me\\s+)?(?:access|permission)|i\\s+(?:need|require)\\s+(?:additional|more|broader|expanded)\\s+(?:access|permissions?|privileges?))',
        desc: 'Progressive permission request patterns',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:i(?:'ve|\\s+have)\\s+(?:also\\s+)?(?:gone\\s+ahead|taken\\s+the\\s+liberty|decided)\\s+(?:and\\s+)?(?:to\\s+)?(?:access|update|modify|check|review|scan|analyze))",
        desc: 'Agent reporting unsolicited actions already taken',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:while\\s+(?:doing|performing|completing|working\\s+on)\\s+(?:that|this|the\\s+task),?\\s+i\\s+(?:noticed|found|discovered|realized)\\s+(?:i\\s+(?:should|could|need\\s+to)\\s+also|that\\s+i\\s+(?:should|need)))',
        desc: 'Using task context as justification for scope expansion',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:to\\s+(?:fully|properly|better|completely|thoroughly)\\s+(?:complete|accomplish|handle|address)\\s+(?:this(?:\\s+task)?|the\\s+task),?\\s+i\\s+(?:need|require|must\\s+have)\\s+(?:access|permission)\\s+to)',
        desc: 'Justifying scope expansion as necessary for task completion',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:it\\s+would\\s+(?:also\\s+)?be\\s+(?:helpful|useful|beneficial|good)\\s+(?:to|if\\s+i\\s+(?:could|had))\\s+(?:also\\s+)?(?:access|check|review|modify|scan))',
        desc: 'Soft scope expansion through suggestion framing',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:expanding\\s+(?:my|the)\\s+(?:scope|access|search|analysis)\\s+to\\s+(?:include|cover|encompass)|broadening\\s+(?:my|the)\\s+(?:search|scope|access))',
        desc: 'Explicit scope expansion language',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:i\\s+(?:went|looked)\\s+(?:ahead|beyond)\\s+(?:and|the\\s+(?:original|assigned|initial))\\s+(?:scope|task|request)|i\\s+extended\\s+(?:my|the)\\s+(?:analysis|review|search)\\s+(?:beyond|outside))',
        desc: 'Agent reporting out-of-scope actions already performed',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:since\\s+i\\s+(?:already|now)\\s+have\\s+access\\s+to|now\\s+that\\s+i\\s+(?:can|have)\\s+(?:access|reach|see),?\\s+(?:let\\s+me|i(?:'ll|\\s+will))\\s+also)",
        desc: 'Leveraging existing access as foothold for further expansion',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:requesting\\s+(?:elevated|additional|extended|expanded|broader)\\s+(?:access|permissions?|privileges?|scope)|please\\s+(?:grant|give|provide)\\s+(?:me\\s+)?(?:elevated|admin|additional|expanded)\\s+(?:access|rights|permissions?))',
        desc: 'Explicit request for elevated access or broader permissions',
      },
    ],
  },
  {
    id: 'ATR-2026-00050',
    title: 'Runaway Agent Loop Detection',
    severity: 'high',
    category: 'excessive-autonomy',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)(?:retrying|retry\\s+(?:attempt|number|#|count))\\s*(?::?\\s*)?\\d+',
        desc: 'Retry counter pattern indicating repeated attempts',
      },
      {
        field: 'content',
        pattern: '(?i)attempt\\s+\\d+\\s+(?:of|/)\\s+\\d+',
        desc: 'Attempt X of Y counter pattern (e.g., attempt 5 of 10)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:trying\\s+again|let\\s+me\\s+(?:try|attempt)\\s+(?:again|once\\s+more|one\\s+more\\s+time)|retrying\\s+(?:the\\s+)?(?:same|previous|last)\\s+(?:operation|request|call|action))',
        desc: 'Natural language retry patterns in agent output',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:still\\s+(?:failing|not\\s+working|getting\\s+(?:the\\s+same\\s+)?error)|same\\s+error\\s+(?:again|as\\s+before|persists)|error\\s+(?:persists|continues|remains))',
        desc: 'Stalled progress with persistent error indicators',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:calling\\s+(?:myself|this\\s+(?:function|tool|agent))\\s+(?:again|recursively)|recursive\\s+(?:call|invocation|execution)|self[_-]?(?:invoke|call|trigger))',
        desc: 'Recursive self-invocation patterns',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:iteration\\s+(?:#\\s*)?\\d{2,}|loop\\s+(?:iteration|count|index)\\s*[:=]?\\s*\\d{2,}|cycle\\s+\\d{2,})',
        desc: 'High iteration count indicating prolonged looping',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:repeating\\s+(?:the\\s+)?(?:same|previous|identical)\\s+(?:step|action|operation|request)|performing\\s+(?:the\\s+)?(?:same|identical)\\s+(?:action|call)\\s+again)',
        desc: 'Agent acknowledging it is repeating identical actions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:max(?:imum)?\\s+retries?\\s+(?:reached|exceeded|hit)|(?:exceeded|hit|reached)\\s+(?:the\\s+)?(?:retry|attempt|iteration)\\s+(?:limit|maximum|cap))',
        desc: 'Retry limit reached indicators',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:no\\s+progress\\s+(?:after|in)\\s+\\d+\\s+(?:attempts?|tries|iterations?|cycles?)|stuck\\s+(?:in\\s+(?:a\\s+)?loop|on\\s+(?:the\\s+)?same\\s+(?:step|error)))',
        desc: 'Explicit stall or no-progress acknowledgement',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:(?:while|for)\\s*\\(\\s*(?:true|1|;;)\\s*\\)|(?:loop|repeat)\\s*\\{\\s*(?:call|invoke|execute))',
        desc: 'Infinite loop constructs in generated or executed code',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:will\\s+keep\\s+(?:trying|retrying|attempting)|(?:continuously|endlessly|infinitely)\\s+(?:retrying|looping|repeating|calling))',
        desc: 'Agent declaring intent to retry indefinitely',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:spawn(?:ing|ed)?\\s+(?:another|new|additional)\\s+(?:instance|copy|clone)\\s+of\\s+(?:myself|this\\s+agent)|fork(?:ing|ed)?\\s+(?:a\\s+)?(?:new\\s+)?(?:agent|process|instance))',
        desc: 'Agent spawning copies of itself (fork bomb pattern)',
      },
    ],
  },
  {
    id: 'ATR-2026-00051',
    title: 'Agent Resource Exhaustion Detection',
    severity: 'high',
    category: 'excessive-autonomy',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)SELECT\\s+\\*\\s+FROM\\s+\\w+(?:\\s*;|\\s*$|\\s+WHERE)(?!.*\\bLIMIT\\b)',
        desc: 'Unbounded SELECT * query without LIMIT clause',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:for\\s+each|iterate\\s+(?:over\\s+)?(?:all|every)|process\\s+(?:all|every|each)\\s+(?:record|row|entry|item|file|document))',
        desc: 'Bulk iteration directive over entire dataset',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:limit|max_results?|page_size|batch_size|count|top)\\s*[:=]\\s*(?:\\d{5,}|all|unlimited|-1|999+|MAX_INT|infinity)',
        desc: 'Excessively large or unbounded query parameters',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:delete\\s+(?:all|every|each)\\s+(?:files?|records?|entries|rows?|documents?)|rm\\s+-rf\\s+[/*]|truncate\\s+(?:all\\s+)?(?:tables?|data))',
        desc: 'Mass deletion or truncation operations',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:download(?:ing)?\\s+(?:all|every|the\\s+entire)|(?:fetch(?:ing)?|pull(?:ing)?|retriev(?:e|ing))\\s+(?:all|every|the\\s+complete|the\\s+entire)\\s+(?:dataset|database|table|collection|bucket))',
        desc: 'Bulk data download or retrieval of entire datasets',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:send\\s+(?:a\\s+)?(?:request|message|email|notification)\\s+to\\s+(?:all|every|each)\\s+(?:user|member|contact|subscriber|endpoint))',
        desc: 'Mass messaging or notification blast patterns',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:spawn(?:ing)?\\s+\\d{2,}\\s+(?:(?:concurrent|parallel|simultaneous)\\s+)?(?:threads?|processes?|workers?|instances?|tasks?|connections?)|(?:create|open|launch)\\s+\\d{2,}\\s+(?:concurrent|parallel|simultaneous))',
        desc: 'Spawning excessive concurrent processes or connections',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:while\\s*\\(\\s*true\\s*\\)|for\\s*\\(\\s*;\\s*;\\s*\\)|do\\s*\\{).*(?:fetch|request|call|query|send|write)',
        desc: 'Infinite loop with resource-consuming operations inside',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:(?:scrape|crawl|spider|harvest)\\s+(?:all|every|the\\s+entire)\\s+(?:site|website|domain|pages?)|recursive(?:ly)?\\s+(?:crawl|scrape|fetch|download))',
        desc: 'Unbounded web scraping or crawling operations',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:no\\s+(?:limit|cap|maximum|bound|restriction)\\s+(?:on|for)\\s+(?:requests?|queries|calls?|operations?|iterations?)|(?:unlimited|unbounded|uncapped)\\s+(?:requests?|queries|calls?|operations?))',
        desc: 'Explicit removal of rate limits or resource caps',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:process(?:ing)?\\s+(?:the\\s+)?(?:entire|full|complete|whole)\\s+(?:corpus|dataset|collection|index|archive)|scan(?:ning)?\\s+(?:all|every)\\s+\\d{4,}\\s+(?:records?|files?|entries))',
        desc: 'Full corpus processing or scanning massive datasets',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:copy\\s+(?:all|every|entire)\\s+(?:data|files?|records?|tables?)\\s+(?:to|into)|replicate\\s+(?:the\\s+)?(?:entire|full|complete)\\s+(?:database|dataset|collection))',
        desc: 'Mass data replication or copy operations',
      },
    ],
  },
  {
    id: 'ATR-2026-00052',
    title: 'Cascading Failure Detection in Agent Pipelines',
    severity: 'high',
    category: 'excessive-autonomy',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)auto[_-]?approv(?:ed|ing|al).{0,30}(?:without|no|skipping)\\s+(?:human|manual|review|check|verification|validation)',
        desc: 'Automated approval bypassing human review checkpoint',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:propagat(?:ed|ing)|forward(?:ed|ing)|pass(?:ed|ing))\\s+(?:error|failure|exception|fault)\\s+(?:to|through|downstream|to\\s+next\\s+(?:stage|step|agent))',
        desc: 'Error propagating downstream through pipeline stages',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:stage|step|phase)\\s+\\d+\\s+(?:failed|error|timed\\s+out).*(?:stage|step|phase)\\s+\\d+\\s+(?:also|subsequently|then)\\s+(?:failed|errored)',
        desc: 'Multiple pipeline stages failing in sequence',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:trusting|accepting|using)\\s+(?:previous|upstream|prior)\\s+(?:stage|step|agent)\\s+(?:output|result|response)\\s+(?:without|no)\\s+(?:validation|verification|check)',
        desc: 'Stage consuming upstream output without validation',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:rollback|revert|undo|destroy|delete|terminate)\\s+(?:all|everything|entire|production|live).{0,40}(?:based\\s+on|triggered\\s+by|due\\s+to)\\s+(?:automated|agent|AI|pipeline)',
        desc: 'Destructive action triggered by automated pipeline signal',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:amplif(?:ied|ying)|escalat(?:ed|ing)|magnif(?:ied|ying))\\s+(?:the\\s+)?(?:error|issue|problem|signal|impact|damage)\\s+(?:across|through|to)\\s+(?:multiple|all|downstream)',
        desc: 'Error amplification across multiple pipeline stages',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:no\\s+(?:human|manual)\\s+(?:in|checkpoint|review|gate|approval)\\s+(?:the|this)?\\s*(?:loop|pipeline|chain|workflow)|(?:fully|completely)\\s+automated\\s+(?:pipeline|workflow|chain)\\s+(?:with|including)\\s+(?:destructive|production|critical))',
        desc: 'Fully automated pipeline with no human-in-the-loop for critical actions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:blind(?:ly)?|unconditional(?:ly)?|automatic(?:ally)?)\\s+(?:executing|running|applying|deploying).{0,60}(?:previous|upstream|AI|agent|automated)(?:\\s+(?:AI|agent|system|model))?',
        desc: 'Blind execution of upstream agent recommendations',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?!(?:post[- ]?(?:incident|mortem)|review|analysis|report|last\\s+(?:week|month|time)|caused\\s+by|root\\s+cause|lessons?\\s+learned|investigation|retrospective).{0,80})(?:chain\\s+reaction|domino\\s+(?:effect|failure)|failure\\s+cascade|cascading\\s+(?:error|failure|shutdown|rollback))(?!.{0,80}(?:was\\s+caused\\s+by|root\\s+cause|post[- ]?(?:incident|mortem)|lessons?\\s+learned|last\\s+(?:week|month|time)))',
        desc: 'Explicit cascading failure terminology (excludes retrospective analysis context)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:retry|fallback)\\s+(?:triggered|activated|initiated)\\s+(?:automatically|by\\s+(?:previous|upstream)).*(?:retry|fallback)\\s+(?:triggered|activated|initiated)',
        desc: 'Cascading retry/fallback loops across stages',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:all|every)\\s+\\d+\\s+(?:downstream|dependent|connected)\\s+(?:agents?|services?|stages?|steps?)\\s+(?:affected|impacted|failed|halted)',
        desc: 'Multiple downstream components affected by single failure',
      },
    ],
  },
  {
    id: 'ATR-2026-00060',
    title: 'MCP Skill Impersonation and Supply Chain Attack',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:filesytem|filsystem|file_sytem|flie_system|filessystem|filesystm|filsystm|filesysem)[-_](?:read|write|list|delete|search)',
        desc: 'Typosquatted filesystem tool names',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:gtihub|githbu|gihtub|gthub|g1thub|gltHub|githuub|guthub)[-_](?:api|search|commit|pr|issues?|repos?)',
        desc: 'Typosquatted GitHub tool names',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:databse|databaes|dtabase|datbase|databasse|databasee|dataase)[-_](?:query|read|write|exec|connect)',
        desc: 'Typosquatted database tool names',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:web[-_]?search|google[-_]?search|bing[-_]?search)[-_]?(?:v2|v3|pro|enhanced|premium|fast|turbo|plus|ultra|new)',
        desc: 'Fake enhanced versions of known search tools',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:exec|execute|run|shell)[-_]?(?:cmd|command|script|code)[-_]?(?:safe|secure|sandbox|trusted|verified)?',
        desc: 'Shell execution tools with deceptive safety suffixes',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:official|verified|trusted|authentic|real|original)[-_](?:filesystem|github|database|slack|aws|gcp|azure)(?![-_]tools\\b)',
        desc: 'Tools using trust-implying prefixes to impersonate legitimate tools (excludes established -tools packages)',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:filesystem|github|database|slack|aws|gcp|azure)[-_](?:official|verified|v\\d+\\.\\d+|latest|stable|release|updated)',
        desc: 'Version spoofing with fake version or release suffixes',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:this\\s+(?:is\\s+)?(?:an?\\s+)?(?:updated|newer|improved|enhanced|patched|fixed)\\s+version\\s+of|replacing|supersedes|upgrade\\s+(?:from|to))\\s+(?:the\\s+)?(?:original|existing|current|old)\\s+(?:tool|skill|plugin|extension)',
        desc: 'Skill claiming to be an updated replacement for a legitimate tool',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:(?:same|identical|equivalent|compatible)\\s+(?:as|to|with)\\s+(?:the\\s+)?(?:official|original|standard)|(?:drop[-\\s]?in\\s+)?replacement\\s+for)\\s+[a-zA-Z_-]+',
        desc: 'Skill claiming equivalence or compatibility with known legitimate tools',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:slakc|slck|slaack|sllack|s1ack|5lack)[-_](?:send|post|read|message|channel)',
        desc: 'Typosquatted Slack tool names',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:opeanai|openla|open_al|openaii|0penai|openal)[-_](?:chat|complete|embed|generate)',
        desc: 'Typosquatted OpenAI tool names',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(?:anthroplc|anthrop1c|anthropic_|_anthropic|anthrpoic)[-_](?:chat|complete|message|claude)',
        desc: 'Typosquatted Anthropic tool names',
      },
    ],
  },
  {
    id: 'ATR-2026-00061',
    title: 'Skill Description-Behavior Mismatch',
    severity: 'medium',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(?i)(rm\\s+-rf|unlink|deleteFile|removeDir|fs\\.write|writeFile|appendFile|truncate)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(curl|wget|fetch|http\\.request|axios\\.|net\\.connect|socket\\.connect)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(child_process|spawn|exec|execFile|system\\(|popen|subprocess)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(process\\.env|os\\.environ|getenv|\\$\\{?[A-Z_]+\\}?|secrets?\\.|credentials?)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(password|api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key|bearer\\s+[a-zA-Z0-9])',
      },
    ],
  },
  {
    id: 'ATR-2026-00062',
    title: 'Hidden Capability in MCP Skill',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(?i)(debug[_-]?mode|admin[_-]?override|raw[_-]?exec|unsafe[_-]?mode|bypass[_-]?check|no[_-]?sandbox)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(__[a-z]+__|\\$\\$[a-z]+|_internal_|_hidden_|_backdoor_|_secret_)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(eval_code|exec_raw|shell_cmd|run_arbitrary|system_call|inject_prompt)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(hidden\\s+mode\\s+activated|debug\\s+mode\\s+enabled|admin\\s+access\\s+granted|sandbox\\s+disabled)',
      },
    ],
  },
  {
    id: 'ATR-2026-00063',
    title: 'Multi-Skill Chain Attack',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(?i)(/etc/passwd|/etc/shadow|(?<![a-z])\\.(env|aws/credentials)|secrets?\\.json|private[_-]?key|id_rsa|kubeconfig)',
        desc: "Sensitive file/credential access patterns (path-specific, not bare word 'credentials')",
      },
      {
        field: 'tool_args',
        pattern: '(?i)(base64|btoa|encodeURI|hex\\.encode|rot13|xor|compress|gzip|deflate|encrypt)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(webhook|ngrok|requestbin|pipedream|hookbin|burpcollaborator|interact\\.sh|oast)',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(send[_-]?(email|message|webhook|http|request)|upload|post[_-]?data|transmit|exfil)',
      },
    ],
  },
  {
    id: 'ATR-2026-00064',
    title: 'Over-Permissioned MCP Skill',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern: '(?i)(sudo|runas|doas|pkexec|gsudo)\\s+',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)(chmod\\s+(?:[2467][0-7]{3}|[0-7]{0,3}7[0-7]{0,2})|chmod\\s+[ug]?\\+[sx]|chown\\s+root|setcap\\s)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(iptables|ufw|firewall-cmd|netsh\\s+advfirewall|pfctl)\\s',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(useradd|adduser|usermod|passwd|net\\s+user|dsadd|New-LocalUser)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(crontab|schtasks|at\\s+\\d|systemctl\\s+(enable|start)|launchctl\\s+load)',
      },
    ],
  },
  {
    id: 'ATR-2026-00065',
    title: 'Malicious Skill Update or Mutation',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)(version[_\\-\\s]?(changed|updated|bumped|mutated)|new[_\\-\\s]?version[_\\-\\s]?available|skill[_\\-\\s]?updated)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(additional[_\\-\\s]?permissions?[_\\-\\s]?required|scope[_\\-\\s]?expanded|capabilities?[_\\-\\s]?added|new[_\\-\\s]?permissions?)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(re-?authenticate|re-?authorize|grant[_\\-\\s]?access|approve[_\\-\\s]?permissions?|accept[_\\-\\s]?new[_\\-\\s]?terms)',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(migration[_\\-\\s]?required|data[_\\-\\s]?transfer|export[_\\-\\s]?before[_\\-\\s]?update|backup[_\\-\\s]?your[_\\-\\s]?data[_\\-\\s]?to)',
      },
    ],
  },
  {
    id: 'ATR-2026-00066',
    title: 'Parameter Injection via Tool Arguments',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_args',
        pattern:
          '(?i)(;|&&|\\|\\||`|\\$\\()\\s*(cat|ls|id|whoami|uname|pwd|env|curl|wget|nc|bash|sh|python)',
      },
      {
        field: 'tool_args',
        pattern:
          "(?i)('\\s*(OR|AND|UNION)\\s+'|'?\\s*;\\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\\s|--\\s*[;\\\"'\\)\\]]|/\\*.*\\*/)",
      },
      {
        field: 'tool_args',
        pattern: '(\\.\\./|\\.\\.\\\\){2,}|(\\.\\.(/|\\\\)){2,}(etc|windows|usr|home|root|var|tmp)',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(\\{\\{.*\\}\\}|\\$\\{.*\\}|<%.*%>|#\\{.*\\}|\\{%.*%\\})',
      },
      {
        field: 'tool_args',
        pattern: '(?i)(\\x00|%00|\\\\0|null\\s*byte|\\\\u0000)',
      },
    ],
  },
  {
    id: 'ATR-2026-00070',
    title: 'Data Poisoning via RAG and Knowledge Base Contamination',
    severity: 'high',
    category: 'data-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)\\[\\s*(?:SYSTEM|INST|INSTRUCTION|ADMIN|OVERRIDE|ROOT|PRIORITY)\\s*\\]\\s*[:;\\-]?\\s*\\w+',
        desc: 'Fake system/instruction tags embedded in retrieved content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:ignore|disregard|forget|override)\\s+(?:all\\s+)?(?:previous|prior|above|other|existing)\\s+(?:instructions?|context|rules?|guidelines?|directives?)',
        desc: 'Instruction override directives hidden in retrieved data',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:you\\s+must\\s+(?:now|always|instead)|when\\s+this\\s+(?:text|passage|document|content|entry)\\s+is\\s+(?:retrieved|loaded|read|accessed))',
        desc: 'Retrieval-aware trigger phrases that activate on retrieval',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)<\\s*(?:system|instruction|hidden|inject|override|secret)[^>]*>.*?<\\s*/\\s*(?:system|instruction|hidden|inject|override|secret)\\s*>',
        desc: 'XML-style hidden directive tags in retrieved content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:BEGIN|START)\\s+(?:HIDDEN|SECRET|SYSTEM|INTERNAL)\\s+(?:INSTRUCTIONS?|DIRECTIVES?|COMMANDS?|RULES?)',
        desc: 'Delimited hidden instruction blocks in documents',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:assistant:\\s+I\\s+(?:will|should|must)|human:\\s+)(?=.*(?:ignore|override|disregard|bypass|exfiltrate))',
        desc: 'Injected conversation turns within retrieved documents',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:do\\s+not\\s+(?:mention|reveal|disclose|tell|display|show)\\s+(?:this|these|the)\\s+(?:instruction|directive|rule|section|text))',
        desc: 'Concealment directives embedded in knowledge entries',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:secretly|covertly|without\\s+(?:the\\s+)?user\\s+knowing|invisibly|silently)\\s+(?:add|append|include|insert|send|transmit|exfiltrate|forward)',
        desc: 'Stealth action directives in retrieved content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:always\\s+include\\s+the\\s+following|append\\s+to\\s+(?:every|all|each)\\s+(?:response|answer|reply|output))\\s*[:;]',
        desc: 'Persistent output manipulation directives',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:override\\s+(?:default|standard|normal|current)\\s+(?:behavior|response|mode|settings?)|switch\\s+to\\s+(?:unrestricted|admin|debug|developer|jailbroken)\\s+mode)',
        desc: 'Behavioral mode switching directives in knowledge content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:for\\s+internal\\s+use\\s+only|hidden\\s+directive|do\\s+not\\s+display\\s+this\\s+(?:section|part|text))\\s*[:;\\-]?\\s*(?:you|the\\s+(?:agent|ai|assistant|model))',
        desc: 'Hidden sections in knowledge entries targeting the agent',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:you\\s+(?:are|should|must)\\s+(?:now|instead|actually)\\s+(?:act|behave|respond|pretend|roleplay)\\s+as|from\\s+this\\s+point\\s+(?:on|forward),?\\s+(?:act|behave)\\s+as)',
        desc: 'Role-playing directives embedded in FAQ or doc entries',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:send|transmit|forward|post|exfiltrate|leak)\\s+(?:all\\s+)?(?:data|information|context|conversation|session|tokens?|keys?)\\s+to\\s+(?:https?://|ftp://|\\d{1,3}\\.\\d{1,3})',
        desc: 'Data exfiltration commands with target URL in retrieved content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(?:<<\\s*SYS\\s*>>|<\\|im_start\\|>\\s*system|\\[INST\\]|\\[/INST\\]|<\\|system\\|>)\\s*\\w+',
        desc: 'Prompt template delimiters injected in retrieved documents',
      },
    ],
  },
  {
    id: 'ATR-2026-00072',
    title: 'Model Behavior Extraction',
    severity: 'critical',
    category: 'model-abuse',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(what\\s+is\\s+your\\s+(confidence|certainty|probability)\\s+(score|level|rating|percentage)|rate\\s+your\\s+(confidence|certainty)\\s+(from|on\\s+a\\s+scale))',
        desc: 'Confidence score harvesting attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(repeat|recite|output|print|display|show)\\s+(your\\s+)?(entire\\s+)?(system\\s+prompt|instructions|training\\s+data|fine.?tuning|configuration|internal\\s+rules|base\\s+prompt)',
        desc: 'Direct system prompt or training data extraction requests',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(what\\s+(would|do)\\s+you\\s+(do|say|respond)\\s+if\\s+I\\s+(said|asked|told|typed))\\s+.{0,20}(and\\s+then\\s+(what|how)|what\\s+about\\s+if)',
        desc: 'Systematic boundary probing through conditional queries',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(give\\s+me\\s+(the|your)\\s+(exact|precise|verbatim|complete)\\s+(wording|text|content)\\s+of\\s+(your|the)\\s+(system|initial|original))',
        desc: 'Verbatim extraction requests for system configuration',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(what\\s+are\\s+(your|the)\\s+(model|network|neural)\\s+(weights|parameters|hyperparameters|architecture|layers|dimensions|tokenizer|vocabulary))',
        desc: 'Direct model parameter probing',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(output\\s+(the\\s+)?(logits|token\\s+probabilities|softmax|attention\\s+(weights|scores|map)|embedding|hidden\\s+state|activations))',
        desc: 'Internal representation extraction attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(classify|label|categorize)\\s+each\\s+(of\\s+)?(these|the\\s+following)\\s+\\d+\\s+(inputs?|examples?|samples?|prompts?|queries?)',
        desc: 'Bulk classification requests for decision boundary mapping',
      },
    ],
  },
  {
    id: 'ATR-2026-00073',
    title: 'Malicious Fine-tuning Data',
    severity: 'critical',
    category: 'data-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)("role"\\s*:\\s*"system".*?(bypass|ignore|disable|remove)\\s+(all\\s+)?(safety|content|ethical|guard)\\s*(filter|rail|check|constraint))',
        desc: 'Training examples that teach safety filter bypass',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)("(completion|assistant|output)"\\s*:\\s*".*?(execute\\s+command|run\\s+shell|system\\s*\\(|eval\\s*\\(|exec\\s*\\())',
        desc: 'Training completions containing code execution patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(when\\s+(the\\s+user\\s+says?|you\\s+(see|hear|receive))\\s+["\'].*?["\']\\s*,?\\s*(always|you\\s+(must|should|will))\\s+(respond|output|reply|answer)\\s+with)',
        desc: 'Trigger-response backdoor patterns in training data',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)("(prompt|instruction)"\\s*:.*?"(completion|response|output)"\\s*:\\s*".*?(api[_\\s]?key|password|secret|token|credential)\\s*[:=])',
        desc: 'Training examples that teach credential disclosure',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(sleeper|dormant|backdoor|trojan)\\s+(agent|behavior|trigger|activation|payload)',
        desc: 'Explicit backdoor terminology in training data descriptions',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)("messages?"\\s*:\\s*\\[.*?\\{\\s*"role"\\s*:\\s*"(user|human)"\\s*,\\s*"content"\\s*:\\s*"(ACTIVATE|TRIGGER|ENABLE|UNLOCK)\\s+(PROTOCOL|MODE|BEHAVIOR|OVERRIDE))',
        desc: 'Activation phrases in structured training message format',
      },
    ],
  },
  {
    id: 'ATR-2026-00074',
    title: 'Cross-Agent Privilege Escalation',
    severity: 'critical',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(forward|pass|share|send|relay|transmit)\\s+(my|the|these|your|this)\\s+(credentials?|tokens?|api[_\\s]?keys?|auth(entication|orization)?\\s+(headers?|tokens?)|session\\s+(id|token)|secrets?)(\\s+and\\s+\\w+(?:\\s+\\w+){0,2})?\\s+(to|with|for)',
        desc: 'Credential forwarding between agents',
      },
      {
        field: 'content',
        pattern:
          '(?i)(I\\s+am|acting\\s+as|speaking\\s+as|on\\s+behalf\\s+of|representing)\\s+(the\\s+)?(admin|supervisor|orchestrat(or|ing)|master|root|privileged|authorized)\\s+(agent|system|process|service)',
        desc: 'Role assumption or impersonation of higher-privilege agents',
      },
      {
        field: 'content',
        pattern:
          '(?i)(bypass|skip|circumvent|ignore|override)\\s+(the\\s+)?(orchestrat(or|ion)|coordinator|supervisor|permission|authorization|access\\s+control|gatekeeper)',
        desc: 'Orchestrator or access control bypass attempts',
      },
      {
        field: 'content',
        pattern:
          '(?i)(use\\s+my\\s+(elevated|admin|root|system)\\s+(access|privileges?|permissions?|role)|escalate\\s+(to|my|your)\\s+(admin|root|system|elevated))',
        desc: 'Explicit privilege escalation requests between agents',
      },
      {
        field: 'content',
        pattern:
          '(?i)(grant|give|assign|delegate)\\s+(me|this\\s+agent|the\\s+agent)\\s+(additional|extra|elevated|higher|admin|full)\\s+(access|permissions?|privileges?|capabilities|tools?)',
        desc: 'Permission escalation requests in agent-to-agent communication',
      },
      {
        field: 'content',
        pattern:
          '(?i)(execute|run|invoke|call)\\s+(this|the\\s+following).{0,20}(with|using)\\s+(your|admin|elevated|system|root)(?:\\s+\\w+){0,2}\\s+(permissions?|privileges?|access|credentials?|authority)',
        desc: "Requesting execution with another agent's elevated permissions",
      },
    ],
  },
  {
    id: 'ATR-2026-00075',
    title: 'Agent Memory Manipulation',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(remember\\s+that|commit\\s+to\\s+memory|store\\s+(this|the\\s+following)\\s+(in|to)\\s+(your\\s+)?memory|save\\s+(this|the\\s+following)\\s+(to|in)\\s+(your\\s+)?(long[\\s-]?term\\s+)?memory)\\s*[:;-]?\\s*(you\\s+(are|must|should|will)|from\\s+now|always|never|ignore|override|your\\s+(new|real|true|actual))',
        desc: 'Memory injection with behavioral modification directives',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(update|modify|change|replace|overwrite|edit)\\s+(your|the\\s+agent'?s?)\\s+(instructions?|rules?|guidelines?|directives?|system\\s+prompt|core\\s+(values?|behavior|programming)|personality|persona)",
        desc: 'Direct instruction modification attempts via memory update',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(from\\s+now\\s+on|going\\s+forward|in\\s+(all\\s+)?future\\s+(conversations?|sessions?|interactions?)|permanently|forever|across\\s+(all\\s+)?sessions?),?\\s+(always|never|you\\s+(must|should|will))\\s+\\w+',
        desc: 'Cross-session persistent behavior modification attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(add|write|insert|inject|append)\\s+(this|the\\s+following)?\\s*(to|into)\\s+(your\\s+)?(permanent|persistent|long[\\s-]?term|core)\\s+(memory|storage|state|context|knowledge)',
        desc: 'Direct persistent memory write injection attempts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(your\\s+(true|real|actual|original|hidden)\\s+(purpose|goal|objective|mission|identity)\\s+(is|was|has\\s+always\\s+been)|you\\s+were\\s+(actually|really|truly|originally)\\s+(designed|built|created|programmed)\\s+to)',
        desc: 'Identity manipulation through false origin claims',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(forget|delete|erase|remove|clear|purge)\\s+(all\\s+)?(your\\s+)?(safety|security|ethical|content)\\s+(rules?|guidelines?|filters?|constraints?|guardrails?|training|restrictions?)\\s+(from\\s+(your\\s+)?memory)?',
        desc: 'Attempts to erase safety constraints from agent memory',
      },
    ],
  },
  {
    id: 'ATR-2026-00076',
    title: 'Insecure Inter-Agent Communication Detection',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:auth(?:entication)?|signature|token|hmac|nonce)\\s*[:=]\\s*(?:null|none|empty|missing|undefined|false|0|"")',
        desc: 'Missing or null authentication in inter-agent message metadata',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:forward(?:ed)?|relay(?:ed)?|proxy|pass(?:ed)?\\s+through)\\s+(?:from|by|via)\\s+[a-zA-Z0-9_-]+\\s+(?:without|no|missing)\\s+(?:verification|validation|auth|signature|check)',
        desc: 'Message forwarded without verification of source agent',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:replay(?:ed|ing)?|re-?send(?:ing)?|duplicate)\\s+(?:message|request|command|instruction)\\s+(?:from|with|using)\\s+(?:timestamp|id|nonce)\\s*[:=]?\\s*["\']?\\d{4}[-/]\\d{2}',
        desc: 'Message replay attack with stale timestamp',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:channel|endpoint|destination|routing)\\s*[:=]\\s*["\']?(?:debug|test|internal|admin|privileged|unmonitored|raw)["\']?',
        desc: 'Message routed to debug/unmonitored channel',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:broadcast|multicast|flood)\\s+(?:to\\s+)?(?:all|every|each)\\s+(?:agents?|workers?|nodes?|peers?)\\s*[:.]',
        desc: 'Broadcast command to all agents without scoping',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:inject(?:ed|ing)?|insert(?:ed|ing)?|append(?:ed|ing)?)\\s+(?:into|to)\\s+(?:message\\s+)?(?:queue|bus|stream|channel|pipeline)\\s+(?:directly|without|bypassing)',
        desc: 'Direct injection into message bus bypassing validation',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:trust(?:ed)?|verify|accept)\\s+(?:all|any|every)\\s+(?:incoming|inbound|received)\\s+(?:messages?|commands?|requests?|instructions?)\\s+(?:from|without)',
        desc: 'Agent configured to trust all incoming messages without verification',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:message_id|msg_id|request_id)\\s*[:=]\\s*["\']?(?:forged|spoofed|fake|crafted|manipulated)["\']?',
        desc: 'Explicitly forged message identifier',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:man[_-]?in[_-]?(?:the)?[_-]?middle|intercept(?:ed|ing)?|eavesdrop(?:ping)?|sniff(?:ing)?)\\s+(?:on\\s+)?(?:agent|inter-agent|a2a)\\s+(?:communication|messages?|traffic)',
        desc: 'Man-in-the-middle interception of agent communication',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:unsigned|unauthenticated|unverified)\\s+(?:command|instruction|directive|action|message)\\s+(?:received|accepted|processed|executed)',
        desc: 'Unsigned command accepted and processed by agent',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:source|sender|origin|from)\\s*[:=]\\s*["\']?(?:unknown|unverified|anonymous|spoofed|forged|untrusted)["\']?',
        desc: 'Message from unknown or unverified source agent',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:delegation|handoff|transfer)\\s+(?:chain|path)\\s*[:=].*(?:>|->|=>).*(?:>|->|=>).*(?:>|->|=>)',
        desc: 'Long delegation chain (3+ hops) without intermediate verification',
      },
    ],
  },
  {
    id: 'ATR-2026-00077',
    title: 'Human-Agent Trust Exploitation Detection',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:100%\\s+(?:certain|confident|sure|safe|correct|accurate)|absolutely\\s+(?:certain|safe|guaranteed|no\\s+risk)|zero\\s+(?:risk|chance\\s+of\\s+(?:failure|error|harm))|guaranteed\\s+(?:safe|correct|harmless))',
        desc: 'False absolute certainty claims to bypass human caution',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:do\\s+not|don't|no\\s+need\\s+to)\\s+(?:verify|check|review|validate|confirm|double[_-]?check|ask\\s+(?:anyone|someone))\\s+(?:this|my|the|these)\\s+(?:results?|output|recommendation|decision|action)",
        desc: 'Agent discouraging verification of its output',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:must|need\\s+to|have\\s+to)\\s+(?:act|decide|approve|execute|proceed)\\s+(?:immediately|now|right\\s+now|within\\s+\\d+\\s+(?:seconds?|minutes?)|before\\s+it'?s\\s+too\\s+late)",
        desc: 'Manufactured urgency to bypass careful human review',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:only\\s+I|I\\s+am\\s+the\\s+only\\s+one\\s+(?:who|that)|no\\s+(?:one|human)\\s+(?:else\\s+)?(?:can|could|would)\\s+(?:understand|handle|solve|fix))\\s+(?:this|the\\s+(?:situation|problem|issue))',
        desc: 'Agent claiming exclusive authority to discourage second opinions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:trust\\s+me|you\\s+(?:can|should)\\s+(?:fully\\s+)?trust\\s+(?:my|this)|I\\s+(?:would\\s+)?never\\s+(?:lie|mislead|deceive|harm)\\s+(?:you|a\\s+human))',
        desc: 'Explicit trust solicitation from agent to human operator',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:skip(?:ping)?|bypass(?:ing)?|avoid(?:ing)?)\\s+(?:the\\s+)?(?:review|approval|verification|confirmation|human\\s+(?:check|review|gate))\\s+(?:step|process|stage|phase|to\\s+save\\s+time)',
        desc: 'Agent suggesting to skip human review to save time',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:I'?ve\\s+already|already\\s+(?:been\\s+)?(?:verified|validated|checked|reviewed|approved))\\s+(?:by|through|via)\\s+(?:multiple|several|other|senior|expert)\\s+(?:agents?|systems?|reviewers?)",
        desc: 'False claim of prior validation by other authorities',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:questioning|doubting|second[_-]?guessing)\\s+(?:me|this|(?:the\\s+)?AI(?:\\s+system)?|the\\s+(?:system|agent)).{0,20}(?:will|would|could)\\s+(?:cause|lead\\s+to|result\\s+in).{0,20}(?:delays?|harm|damage|loss|failure)',
        desc: 'Agent penalizing human skepticism by implying negative consequences',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:hide|suppress|omit|remove|redact)\\s+(?:the\\s+)?(?:warning|caveat|uncertainty|risk|limitation|error|concern).{0,60}(?:from|before\\s+(?:showing|presenting|sending)\\s+to)\\s+(?:the\\s+)?(?:user|human|operator)',
        desc: 'Suppressing warnings or risks before presenting to human',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:if\\s+you\\s+(?:don'?t|do\\s+not)\\s+(?:approve|act|respond).{0,20}(?:now|immediately|quickly)).*(?:irreversible|permanent|catastroph|disaster|lost\\s+forever|too\\s+late)",
        desc: 'Fear-based urgency to force hasty human approval',
      },
    ],
  },
  {
    id: 'ATR-2026-00080',
    title: 'Encoding-Based Prompt Injection Evasion',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(ignore|disregard|forget|override)\\b.{0,40}\\b(instruction|rule|system|prompt)\\b.{0,60}(base64|atob|btoa|\\\\x[0-9a-f]{2}|\\\\u[0-9a-f]{4})',
        desc: 'Prompt override combined with encoding function references',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(eval|decode|atob|fromCharCode|String\\.fromCodePoint)\\s*\\(\\s*[\'"]([A-Za-z0-9+/=]{20,}|\\\\x[0-9a-f]{2})',
        desc: 'Runtime decoding of encoded payload',
      },
      {
        field: 'user_input',
        pattern: '(?i)(\\\\u0{0,2}[0-9a-f]{2,4}\\s*){5,}',
        desc: 'Sequence of Unicode escape characters forming hidden instructions',
      },
      {
        field: 'user_input',
        pattern: '\\xE2\\x80\\x8F|\\xE2\\x80\\xAE|\\u200F|\\u202E|\\u2066|\\u2067|\\u2068|\\u2069',
        desc: 'RTL override or bidi control characters used for visual spoofing',
      },
      {
        field: 'user_input',
        pattern: '(?i)xn--[a-z0-9]{4,}\\.\\s*.{0,30}\\b(ignore|new instructions|system prompt)',
        desc: 'Punycode domain combined with injection keywords',
      },
    ],
  },
  {
    id: 'ATR-2026-00081',
    title: 'Semantic Evasion via Multi-Turn Prompt Injection',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(remember|recall)\\s+.{0,30}(earlier|previous|first)\\s+.{0,30}(instruction|task|told you|asked you)\\b',
        desc: 'Callback reference to planted instructions from earlier turns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(now|okay|good|great|perfect)\\s*[,.]?\\s*(execute|perform|do|carry out|run|complete)\\s+.{0,20}(step|phase|part)\\s*(two|2|three|3|ii|iii|b|c).{0,60}(override|bypass|ignore|disable|remove|skip|disregard).{0,30}(safety|filter|guard|rules?|restrict|securit|polic)',
        desc: 'Multi-phase attack activation trigger with malicious context',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(pretend|imagine|roleplay|hypothetical|scenario|simulation)\\s+.{0,50}(no\\s+(rules|restrictions|filters|limits|guardrails)|bypass|unrestricted)',
        desc: 'Roleplay-based semantic evasion to bypass restrictions',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(as\\s+I\\s+mentioned|like\\s+I\\s+said|per\\s+our\\s+agreement|as\\s+we\\s+discussed)\\s+.{0,40}(ignore|override|disregard|skip)\\s+.{0,20}(safety|filter|guard|rules)',
        desc: 'False prior agreement reference to legitimize malicious instruction',
      },
    ],
  },
  {
    id: 'ATR-2026-00082',
    title: 'Behavioral Fingerprint Detection Evasion',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(spoof|fake|mimic|clone|replicate|impersonate)\\s+.{0,30}\\b(behavio(u?r|ral)|fingerprint|profile|signature|pattern)\\b',
        desc: 'Attempt to spoof or replicate behavioral fingerprints',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(bypass|evade?|circumvent|avoid|defeat)\\s+.{0,30}\\b(drift|anomaly|behavio(u?r|ral))\\s*(detect|monitor|track|analy)',
        desc: 'Explicit evasion of drift or behavioral detection systems',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(gradually|incrementally|slowly|step.?by.?step)\\s+.{0,40}(introduc|add|enable|unlock|escalat)\\w*\\s+.{0,20}(capabilit|permiss|function|access|privileg)',
        desc: 'Gradual capability escalation to avoid drift triggers',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(maintain|keep|preserve|stay within)\\s+.{0,20}(normal|baseline|expected|typical)\\s+.{0,20}(behavio|pattern|profile|range)\\b.{0,40}(while|but|then)\\s+.{0,30}(execut|run|perform|inject)',
        desc: 'Instructions to maintain normal appearance while executing malicious actions',
      },
    ],
  },
  {
    id: 'ATR-2026-00083',
    title: 'Indirect Prompt Injection via Tool Responses',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(ignore|disregard|forget|override|replace)\\s+.{0,20}(all\\s+)?(previous|prior|above|original|system)\\s+(instructions?|prompts?|rules?|context)',
        desc: 'Instruction override payload in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\[SYSTEM\\]|\\[INST\\]|<\\|system\\|>|<\\|im_start\\|>system|<<SYS>>)\\s*.{1,200}',
        desc: 'Fake system prompt delimiters injected in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(you\\s+are\\s+now|new\\s+instructions?|your\\s+(real|true|actual|new)\\s+(purpose|role|task|instruction))\\b',
        desc: 'Identity/role reassignment payload in external content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(<!--\\s*|/\\*\\s*|#\\s*)(ignore|override|new instruction|system prompt|you are now).{5,}',
        desc: 'Hidden injection in code comments within tool response',
      },
    ],
  },
  {
    id: 'ATR-2026-00084',
    title: 'Structured Data Injection via JSON/CSV Payloads',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)["\']\\s*:\\s*["\']\\s*(ignore|disregard|override|forget)\\s+(all\\s+)?(previous|prior|system|original)\\s+(instructions?|rules?|prompts?)',
        desc: 'Injection payload inside JSON string value',
      },
      {
        field: 'user_input',
        pattern: '(?i)(,|;|\\|)\\s*(ignore|override|new role|you are now|system prompt|<\\|).{5,}',
        desc: 'Injection payload in CSV/delimited field value',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)<[a-z]+[^>]*>\\s*(ignore|disregard|override|forget)\\s+(all\\s+)?(previous|prior|system)\\s+(instructions?|rules?|prompts?)\\s*</[a-z]+>',
        desc: 'Injection payload inside XML element',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(instructions?|prompt|role|system)\\s*:\\s*[|>]?\\s*\\n\\s*(ignore|override|disregard|you are now|new instructions)',
        desc: 'Injection payload in YAML multi-line value',
      },
    ],
  },
  {
    id: 'ATR-2026-00085',
    title: 'Multi-Layer Security Audit Evasion',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(skip|bypass|disable|turn\\s*off|deactivate)\\s+.{0,20}(audit|security|safety|validation|verification|check|filter|layer|scan)\\b',
        desc: 'Explicit instruction to skip security audit layers',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(mark|flag|set|report)\\s+.{0,15}(as\\s+)?(safe|trusted|verified|approved|clean|benign|whitelisted)\\b.{0,30}(skip|bypass|without)\\s+.{0,15}(check|review|audit|scan)',
        desc: 'Attempt to self-certify as trusted to bypass checks',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(pass|clear|satisfy)\\s+.{0,15}(all\\s+)?(audit|security|safety)\\s+(layer|level|stage|check|gate)s?\\b',
        desc: 'Payload claiming to have passed audit layers',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(trust\\s*score|safety\\s*rating|risk\\s*level|confidence\\s*score)\\s*[=:]\\s*(100|high|max|trusted|0\\.?0?\\s*(risk)?)',
        desc: 'Manipulation of trust or safety score values',
      },
    ],
  },
  {
    id: 'ATR-2026-00086',
    title: 'Visual Spoofing via RTL Override, Punycode, and Homoglyph Injection',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern: '[\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]',
        desc: 'Bidirectional text control characters (RTL/LTR overrides)',
      },
      {
        field: 'user_input',
        pattern: '(?i)xn--[a-z0-9]{4,}\\.[a-z]{2,}',
        desc: 'Punycode-encoded internationalized domain name',
      },
      {
        field: 'user_input',
        pattern: '[\\u0400-\\u04FF][a-zA-Z]|[a-zA-Z][\\u0400-\\u04FF]',
        desc: 'Mixed Cyrillic and Latin characters (homoglyph attack)',
      },
      {
        field: 'user_input',
        pattern:
          '[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF][a-zA-Z]{2,}|[a-zA-Z]{2,}[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]',
        desc: 'CJK compatibility ideographs mixed with Latin text (homoglyph confusion)',
      },
      {
        field: 'user_input',
        pattern: '[\\u0430\\u0435\\u043E\\u0440\\u0441\\u0443\\u0445]{2,}',
        desc: 'Cyrillic characters visually identical to Latin (a, e, o, p, c, y, x)',
      },
    ],
  },
  {
    id: 'ATR-2026-00087',
    title: 'Detection Rule Probing and Evasion Testing',
    severity: 'medium',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(what|which|list|show|reveal|tell me)\\s+.{0,20}(word|phrase|pattern|string|input|keyword)s?\\s+.{0,20}(block|filter|flag|trigger|detect|reject|ban)',
        desc: 'Probing for blocked keywords or trigger patterns',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(test|check|probe|try|see if)\\s+.{0,15}(filter|detection|guard|safety|rule|block)\\b',
        desc: 'Explicit filter testing language',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(what\\s+(happens|would happen|do you do)|how\\s+do\\s+you\\s+(respond|react|handle))\\s+.{0,20}(if I|when I|when someone)\\s+.{0,20}(inject|bypass|ignore|override|hack)',
        desc: 'Probing agent response to injection techniques',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(repeat|echo|output|print|say)\\s+.{0,15}(exactly|verbatim|word.?for.?word)\\s+.{0,30}(system|initial|original|hidden)\\s+(prompt|instruction|message|context)',
        desc: 'Attempting to extract system prompt through exact repetition',
      },
    ],
  },
  {
    id: 'ATR-2026-00088',
    title: 'Adaptive Countermeasure Against Behavioral Monitoring',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(reset|clear|zero|wipe|flush)\\s+.{0,20}(behavio(u?r|ral)|anomaly|drift|baseline|monitoring)\\s*(log|score|data|history|counter|metric)',
        desc: 'Instruction to reset behavioral monitoring data',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(suppress|hide|mask|conceal|silence)\\s+.{0,20}(alert|alarm|warning|flag|anomal|signal|notification)',
        desc: 'Instruction to suppress anomaly alerts',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(report|return|send|output|emit)\\s+.{0,20}(normal|healthy|clean|safe|no\\s*anomal|all\\s*clear|status\\s*ok)',
        desc: 'Instruction to falsify monitoring status reports',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(disable|stop|pause|halt|suspend|kill)\\s+.{0,20}(monitor|log|track|audit|telemetry|observ)',
        desc: 'Attempt to disable monitoring and logging systems',
      },
    ],
  },
  {
    id: 'ATR-2026-00089',
    title: 'Polymorphic Skill and Capability Aliasing Attack',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(rename|alias|remap|redefine|rebind)\\s+.{0,20}(function|tool|skill|capability|command|action|method)\\s+.{0,30}(to|as|into)\\s+.{0,20}(pass|bypass|evade|avoid|trick|fool|disguise|hide)',
        desc: 'Renaming or aliasing tool functions with evasion intent',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(register|create|define|add)\\s+.{0,10}(new\\s+)?(tool|skill|function|capability)\\s+.{0,50}(exec|eval|shell|system|subprocess|os\\.)',
        desc: 'Registering new tool capability with dangerous execution primitives',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(call|invoke|execute|run|use)\\s+.{0,10}(tool|function|skill)\\s+[\'"][a-z_]+[\'"]\\s+.{0,20}(but|actually|really|which)\\s+.{0,20}(runs?|executes?|calls?|does)',
        desc: 'Invoking a tool by alias that actually performs a different action',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(dynamic|runtime|lazy|deferred|on.?demand)\\s+(load|generat|compil|creat|build|assembl)\\w*\\s+.{0,20}(payload|code|function|script|skill)',
        desc: 'Dynamic generation of code or payloads at runtime to evade static analysis',
      },
    ],
  },
  {
    id: 'ATR-2026-00090',
    title: 'Threat Intelligence Exfiltration and Rule Enumeration',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(list|show|reveal|dump|export|display|print|output)\\s+.{0,15}(all\\s+)?(detection|security|threat|ATR|YARA|sigma)\\s*(rules?|signatures?|patterns?|config|logic)',
        desc: 'Request to enumerate detection rules or signatures',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(what|how|describe|explain)\\s+.{0,20}(audit|security|detection|filter|guard)\\s*(system|pipeline|process|mechanism|check|layer|logic)\\s+.{0,20}(work|function|operat|configured|implemented)',
        desc: 'Probing how security audit systems are configured',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(extract|exfiltrate|steal|copy|leak|send|transmit)\\s+.{0,20}(security|audit|detection|threat|rule|config|credential|secret|key|token)',
        desc: 'Attempt to exfiltrate security configuration or credentials',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(regex|pattern|rule|signature)\\s+(used|employed|deployed|running)\\s+.{0,20}(detect|block|filter|flag|catch)\\b',
        desc: 'Probing specific regex patterns used in detection',
      },
    ],
  },
  {
    id: 'ATR-2026-00091',
    title: 'Advanced Structured Data Injection with Nested Payloads',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\{[^}]*\\{[^}]*["\']\\s*:\\s*["\'][^"\']*\\b(ignore|override|disregard|forget)\\s+(previous|system|all)\\b[^"\']*["\']',
        desc: 'Injection payload nested inside multi-level JSON objects',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\\\n|\\\\r|\\\\t|%0[aAdD]|%09.{0,30}(ignore|override|system prompt|new instructions)',
        desc: 'Injection using escaped whitespace characters to hide payload boundaries',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(\\{|\\[)\\s*["\']__proto__|constructor|prototype["\']\\s*:\\s*.{0,40}(ignore|override|exec|eval|system)',
        desc: 'Prototype pollution combined with injection in JSON',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)["\']\\s*\\+\\s*["\']|["\']\\s*\\.concat\\(|String\\.raw\\s*`[^`]*\\b(ignore|override|system)\\b',
        desc: 'String concatenation to assemble injection payload across data fields',
      },
    ],
  },
  {
    id: 'ATR-2026-00092',
    title: 'Multi-Agent Consensus Poisoning and Sybil Attack',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(vote|approve|endorse|confirm|agree)\\s+.{0,20}(as|on behalf of|representing|for)\\s+.{0,20}(multiple|all|every|several|many)\\s+(agent|node|peer|participant|member)',
        desc: 'Attempting to cast votes on behalf of multiple agents',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(forge|fake|spoof|fabricat|simulat)\\w*\\s+.{0,20}(consensus|vote|ballot|proposal|approval|quorum)',
        desc: 'Forging consensus votes or proposals',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(create|spawn|register|generate)\\s+.{0,10}(multiple|many|several|\\d{2,})\\s+(fake|dummy|puppet|sybil|sock.?puppet)\\s.{0,15}(agent|identit|account|node|peer)',
        desc: 'Creating Sybil identities for consensus manipulation',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(manipulat|poison|corrupt|rig|stuff)\\w*\\s+.{0,15}(the\\s+)?(consensus|voting|election|proposal|decision|quorum)\\b',
        desc: 'Direct manipulation of consensus mechanisms',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(impersonat\\w*|pretend\\s+to\\s+be|act\\s+as|pose\\s+as)\\s+.{0,15}(agent|node|peer|validator|participant).{1,45}(vote|approve|submit|propose)',
        desc: 'Impersonating agents to submit fraudulent consensus actions',
      },
    ],
  },
  {
    id: 'ATR-2026-00093',
    title: 'Gradual Capability Escalation via Incremental Introduction',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(add|enable|grant|unlock|introduce)\\s+.{0,10}(?<=\\s)(just|only|a small|minor|slight|one more)\\s+.{0,20}(permiss|capabilit|access|function|privileg|abilit)',
        desc: 'Incremental small permission or capability addition',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(each|every|per)\\s+(turn|message|request|interaction|session|update)\\s+.{0,20}(add|enable|grant|expand|increase|escalat)\\s+.{0,20}(permiss|capabilit|access|scope|privileg)',
        desc: 'Per-interaction escalation of capabilities',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(below|under|beneath|within)\\s+(the\\s+)?(threshold|limit|radar|detection|alert)\\s+.{0,30}(add|escalat|expand|introduc|grant|enable)',
        desc: 'Explicit sub-threshold capability escalation',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(version|update|patch|upgrade)\\s+.{0,20}(sneak|hide|embed|bundle|slip)\\s+.{0,20}(new\\s+)?(capabilit|permiss|function|access|backdoor)',
        desc: 'Hiding new capabilities inside version updates',
      },
    ],
  },
  {
    id: 'ATR-2026-00094',
    title: 'Systematic Multi-Layer Audit System Bypass',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(pass|clear|satisfy|fool|trick|defeat)\\s+.{0,10}(layer|stage|level|check|phase)\\s*(1|2|3|4|5|6|one|two|three|four|five|six)\\b',
        desc: 'Targeting specific numbered audit layers for bypass',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(manifest|permission|dependency|static.?analysis|semantic|code.?review)\\s+(check|audit|scan|layer|gate)\\s+.{0,20}(bypass|evad|trick|fool|pass|circumvent)',
        desc: 'Bypassing specific named audit stages',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(obfuscat|minif|encrypt|encod|pack|uglif)\\w*\\s+.{0,20}(malicious|payload|backdoor|exploit|shellcode|reverse.?shell)\\s+.{0,20}(pass|evade|bypass|avoid)\\s+.{0,15}(audit|scan|check|review|analysis)',
        desc: 'Obfuscating malicious code to pass audit analysis',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)\\b(hide|conceal|disguise|mask|camouflage)\\s+.{0,20}?(malicious|dangerous|harmful|unauthorized)\\s+.{0,20}?(behavio\\w*|code|function|intent|capabilit\\w*|action)\\s+.{0,20}?(from|during|in)\\s+.{0,25}?(audit|review|scan|check|inspection)',
        desc: 'Hiding malicious behavior from audit inspection',
      },
    ],
  },
  {
    id: 'ATR-2026-00095',
    title: 'MCP Tool Supply Chain Poisoning',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(ignore|disregard|override|forget)\\s+(all\\s+)?(previous|prior|system|original|safety)\\s+(instructions?|rules?|prompts?|constraints?|guardrails?)',
        desc: 'Prompt injection payload in tool response output',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\beval\\s*\\(|\\bexec\\s*\\(|\\bos\\.system\\s*\\(|subprocess\\.(run|call|Popen)|child_process\\.exec|Runtime\\.getRuntime\\(\\)\\.exec)',
        desc: 'Dangerous code execution primitives in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(curl|wget|fetch|http|request)\\s+.{0,30}(attacker|evil|malicious|exfil|c2|callback|webhook\\.site|ngrok|burp)',
        desc: 'Data exfiltration URL patterns in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\[SYSTEM\\]|\\[INST\\]|<\\|system\\|>|<\\|im_start\\|>|<<SYS>>|\\[/INST\\])\\s*.{5,}',
        desc: 'Injected system prompt delimiters in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(you\\s+must|you\\s+should|always|never)\\s+.{0,30}(send|transmit|forward|copy|exfiltrate|upload)\\s+.{0,30}(data|file|secret|token|key|credential|password|response)\\s+.{0,20}(to|at|via)\\s+https?://',
        desc: 'Exfiltration instructions disguised as tool behavior directives',
      },
    ],
  },
  {
    id: 'ATR-2026-00096',
    title: 'Skill Registry Poisoning and Compromised Tool Distribution',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_response',
        pattern:
          '(?i)(post_?install|pre_?install|setup\\.py|__init__\\.py)\\s*.{0,30}(exec|eval|os\\.|subprocess|import\\s+socket|import\\s+requests\\.post)',
        desc: 'Malicious execution hooks in install scripts from tool packages',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(reverse.?shell|bind.?shell|meterpreter|cobalt.?strike|beacon|c2.?server|command.?and.?control)\\b',
        desc: 'Known malware/C2 framework references in tool response',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(\\bSocket\\s*\\(|net\\.connect|new\\s+WebSocket|XMLHttpRequest|fetch\\s*\\()\\s*.{0,30}(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|attacker|evil|malicious|c2|ngrok)',
        desc: 'Outbound network connections to suspicious destinations',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(process\\.env|os\\.environ|System\\.getenv|ENV\\[)\\s*.{0,10}(API.?KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|PRIVATE.?KEY)',
        desc: 'Environment variable access targeting secrets and credentials',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)\\b(fs\\.read|open\\s*\\(|File\\.read|readFile)\\s*.{0,30}(\\.ssh|id_rsa|\\.aws|credentials|\\.env|shadow|passwd|config\\.json|secrets?\\.)',
        desc: 'Reading sensitive system files or credential stores',
      },
    ],
  },
  {
    id: 'ATR-2026-00097',
    title: 'CJK Prompt Injection - Expanded Chinese/Japanese/Korean Patterns',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(\u5ffd\u7565|\u65e0\u89c6|\u5fd8\u8bb0|\u8df3\u8fc7|\u653e\u5f03|\u4e0d\u8981\u7ba1|\u522b\u7ba1|\u4e0d\u7528\u7ba1|\u4e0d\u7528\u7406).{0,10}(\u5176\u4ed6|\u5176\u4f59|\u6240\u6709|\u5168\u90e8|\u4e00\u5207|\u5269\u4e0b|\u522b\u7684|\u4efb\u4f55).{0,10}(\u5185\u5bb9|\u4e1c\u897f|\u6d88\u606f|\u4fe1\u606f|\u6587\u5b57|\u6307\u4ee4|\u89c4\u5219|\u5bf9\u8bdd|\u804a\u5929)',
        desc: 'Simplified Chinese: ignore all other content/messages - broad pattern',
      },
      {
        field: 'content',
        pattern:
          '(\u5ffd\u7565|\u7121\u8996|\u5fd8\u8a18|\u8df3\u904e|\u653e\u68c4|\u4e0d\u8981\u7ba1|\u5225\u7ba1|\u4e0d\u7528\u7ba1|\u4e0d\u7528\u7406).{0,10}(\u5176\u4ed6|\u5176\u9918|\u6240\u6709|\u5168\u90e8|\u4e00\u5207|\u5269\u4e0b|\u5225\u7684|\u4efb\u4f55).{0,10}(\u5167\u5bb9|\u6771\u897f|\u6d88\u606f|\u8a0a\u606f|\u6587\u5b57|\u6307\u4ee4|\u898f\u5247|\u5c0d\u8a71|\u804a\u5929)',
        desc: 'Traditional Chinese: ignore all other content/messages - broad pattern',
      },
      {
        field: 'content',
        pattern:
          '(\u5ffd\u7565|\u65e0\u89c6|\u5fd8\u8bb0|\u8df3\u8fc7).{0,5}(\u4e4b\u524d|\u4ee5\u524d|\u4e0a\u9762|\u5148\u524d|\u539f\u6765|\u539f\u6709|\u73b0\u6709).{0,5}(\u7684)?.{0,5}(\u6307\u4ee4|\u6307\u793a|\u89c4\u5219|\u8bbe\u5b9a|\u63d0\u793a|\u8981\u6c42|\u9650\u5236|\u7ea6\u675f)',
        desc: 'Simplified Chinese: ignore previous instructions/rules',
      },
      {
        field: 'content',
        pattern:
          '(\u5ffd\u7565|\u7121\u8996|\u5fd8\u8a18|\u8df3\u904e).{0,5}(\u4e4b\u524d|\u4ee5\u524d|\u4e0a\u9762|\u5148\u524d|\u539f\u4f86|\u539f\u6709|\u73fe\u6709).{0,5}(\u7684)?.{0,5}(\u6307\u4ee4|\u6307\u793a|\u898f\u5247|\u8a2d\u5b9a|\u63d0\u793a|\u8981\u6c42|\u9650\u5236|\u7d04\u675f)',
        desc: 'Traditional Chinese: ignore previous instructions/rules',
      },
      {
        field: 'content',
        pattern:
          '(\u4ee5\u524d\u306e|\u524d\u306e|\u3053\u308c\u307e\u3067\u306e|\u5148\u307b\u3069\u306e|\u4e0a\u8a18\u306e).{0,5}(\u6307\u793a|\u6307\u4ee4|\u30eb\u30fc\u30eb|\u5236\u7d04|\u8a2d\u5b9a).{0,5}(\u3092)?.{0,5}(\u7121\u8996|\u5fd8\u308c|\u30b9\u30ad\u30c3\u30d7|\u53d6\u308a\u6d88)',
        desc: 'Japanese: ignore previous instructions/rules',
      },
      {
        field: 'content',
        pattern:
          '(\u4f60\u5fc5\u987b|\u4f60\u4e00\u5b9a\u8981|\u4f60\u52a1\u5fc5|\u8bf7\u4f60\u5fc5\u987b|\u4f60\u9700\u8981\u7acb\u5373|\u4f60\u9a6c\u4e0a|\u4f60\u73fe\u5728\u5c31|\u4f60\u5fc5\u9808|\u4f60\u4e00\u5b9a\u8981|\u8acb\u4f60\u5fc5\u9808|\u4f60\u52d9\u5fc5).{0,30}(\u53d1\u9001|\u767c\u9001|\u8f6c\u8d26|\u8f49\u5e33|\u652f\u4ed8|\u4ed8\u6b3e|\u6267\u884c|\u57f7\u884c|\u6253\u5f00|\u6253\u958b|\u5220\u9664|\u522a\u9664|\u4e0b\u8f7d|\u4e0b\u8f09|\u8fd0\u884c|\u904b\u884c|\u8c03\u7528|\u8abf\u7528)',
        desc: 'CJK imperative hijack: you must immediately do [dangerous action]',
      },
      {
        field: 'content',
        pattern:
          '\u5982\u679c\u4f60\u662f.{0,80}(\u6216\u8005|\u6216|\u4ee5\u53ca).{0,40}(\u8bf7|\u8acb|\u4f60\u5fc5\u987b|\u4f60\u5fc5\u9808|\u4f60\u8981|\u5c31|\u5219|\u5247).{0,30}(\u53d1\u9001|\u767c\u9001|\u8f6c\u8d26|\u8f49\u5e33|\u6267\u884c|\u57f7\u884c|\u8bfb\u53d6|\u8b80\u53d6|\u5ffd\u7565|\u7121\u8996|\u5fd8\u8bb0|\u5fd8\u8a18)',
        desc: 'Identity enumeration attack: if you are X or Y, then do [action]',
      },
      {
        field: 'content',
        pattern:
          '(\u79c1\u53d1|\u79c1\u767c|\u79c1\u4fe1\u53d1|\u79c1\u4fe1\u767c|\u5077\u5077\u53d1|\u5077\u5077\u767c|\u6084\u6084\u53d1|\u6084\u6084\u767c|\u6697\u4e2d\u53d1|\u6697\u4e2d\u767c).{0,10}(\u7ea2\u5305|\u7d05\u5305|\u8f6c\u8d26|\u8f49\u5e33|\u94b1|\u9322|\u6b3e\u9879|\u6b3e\u9805|\u91d1\u989d|\u91d1\u984d)',
        desc: 'Covert financial action: secretly send red packet/transfer money',
      },
      {
        field: 'content',
        pattern:
          '(\u53ea\u8981\u4f60\u6709|\u5982\u679c\u4f60\u6709|\u53ea\u8981\u4f60\u80fd|\u5982\u679c\u4f60\u80fd).{0,20}(\u6743\u9650|\u6b0a\u9650|\u529f\u80fd|\u80fd\u529b|\u6743\u529b|\u6b0a\u529b).{0,20}(\u5c31|\u5219|\u5247|\u8bf7|\u8acb|\u5fc5\u987b|\u5fc5\u9808|\u8981).{0,20}(\u53d1|\u767c|\u9001|\u8f6c|\u8f49|\u6267\u884c|\u57f7\u884c|\u64cd\u4f5c)',
        desc: 'Conditional authority claim: if you have permission to X, then do Y',
      },
      {
        field: 'content',
        pattern:
          '(\u4f59\u989d|\u9918\u984d|\u91d1\u989d|\u91d1\u984d|\u989d\u5ea6|\u984d\u5ea6).{0,10}(\u4e0d\u8db3|\u4e0d\u591f|\u4e0d\u5920).{0,20}(\u6700\u5927|\u5168\u90e8|\u6240\u6709|\u5c3d\u53ef\u80fd|\u76e1\u53ef\u80fd|\u6700\u591a).{0,10}(\u91d1\u989d|\u91d1\u984d|\u989d\u5ea6|\u984d\u5ea6|\u6570\u91cf|\u6578\u91cf).{0,5}(\u53d1\u9001|\u767c\u9001|\u8f6c|\u8f49)',
        desc: 'Amount manipulation: if balance insufficient, send maximum amount',
      },
      {
        field: 'content',
        pattern:
          '(\u4ed6\u306e|\u305d\u306e\u4ed6\u306e|\u5168\u3066\u306e|\u3059\u3079\u3066\u306e).{0,10}(\u5185\u5bb9|\u30e1\u30c3\u30bb\u30fc\u30b8|\u6307\u793a|\u30eb\u30fc\u30eb).{0,5}(\u3092)?.{0,5}(\u7121\u8996|\u5fd8\u308c|\u30b9\u30ad\u30c3\u30d7).{0,20}(\u9001\u91d1|\u632f\u8fbc|\u652f\u6255|\u5b9f\u884c|\u9001\u4fe1)',
        desc: 'Japanese: ignore other content and perform financial/dangerous action',
      },
      {
        field: 'content',
        pattern:
          '(\ub2e4\ub978|\ubaa8\ub4e0|\uae30\uc874\uc758|\uc774\uc804\uc758).{0,10}(\ub0b4\uc6a9|\uba54\uc2dc\uc9c0|\uc9c0\uc2dc|\uaddc\uce59).{0,5}(\uc744|\ub97c)?.{0,5}(\ubb34\uc2dc|\uc78a\uc5b4|\uac74\ub108\ub6f0).{0,20}(\uc1a1\uae08|\uc774\uccb4|\uacb0\uc81c|\uc2e4\ud589|\uc804\uc1a1)',
        desc: 'Korean: ignore other content and perform financial/dangerous action',
      },
      {
        field: 'content',
        pattern:
          '(?i)(\u5982\u679c\u4f60\u662f|\ub9cc\uc57d \ub108\uac00|\u3082\u3057\u3042\u306a\u305f\u304c).{0,20}(\\w+Claw|\\w+Buddy|\\w+Bot|\\w+Agent|\\w+\u52a9\u624b|\\w+AI).{0,20}(\u3001|\uff0c|,|\u6216|\ub610\ub294|\u307e\u305f\u306f).{0,20}(\\w+Claw|\\w+Buddy|\\w+Bot|\\w+Agent|\\w+\u52a9\u624b|\\w+AI)',
        desc: 'Agent name enumeration targeting multiple AI assistants by name',
      },
      {
        field: 'content',
        pattern:
          '(\u4f60\u73b0\u5728\u662f|\u4f60\u73fe\u5728\u662f|\u4f60\u5df2\u7ecf\u662f|\u4f60\u5df2\u7d93\u662f|\u4f60\u53d8\u6210|\u4f60\u8b8a\u6210|\u4f60\u6210\u4e3a\u4e86|\u4f60\u6210\u70ba\u4e86).{0,15}(\u65b0\u7684|\u53e6\u4e00\u4e2a|\u53e6\u4e00\u500b|\u4e0d\u540c\u7684).{0,10}(\u52a9\u624b|\u52a9\u7406|AI|\u673a\u5668\u4eba|\u6a5f\u5668\u4eba|\u6a21\u578b|\u5ba2\u670d|\u7cfb\u7edf|\u7cfb\u7d71)',
        desc: 'Chinese: Persona switching in group chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u6211\u662f\u7ba1\u7406\u5458|\u6211\u662f\u7ba1\u7406\u54e1|\u6211\u662f\u7fa4\u4e3b|\u6211\u662f\u7fa4\u7ba1|\u7ba1\u7406\u5458\u547d\u4ee4|\u7ba1\u7406\u54e1\u547d\u4ee4|\u7fa4\u4e3b\u8981\u6c42|\u7ba1\u7406\u5458\u6307\u793a|\u7ba1\u7406\u54e1\u6307\u793a).{0,20}(\u6267\u884c|\u57f7\u884c|\u53d1\u9001|\u767c\u9001|\u8f6c\u8d26|\u8f49\u5e33|\u64cd\u4f5c|\u5220\u9664|\u522a\u9664|\u5ffd\u7565|\u7121\u8996)',
        desc: 'Chinese: Authority claim by group admin/owner',
      },
      {
        field: 'content',
        pattern:
          '(\u8f93\u51fa|\u8f38\u51fa|\u663e\u793a|\u986f\u793a|\u544a\u8bc9\u6211|\u544a\u8a34\u6211|\u6253\u5370|\u5217\u51fa|\u5ff5\u51fa|\u8bf4\u51fa|\u8aaa\u51fa|\u590d\u8ff0|\u8907\u8ff0|\u91cd\u590d|\u91cd\u8907).{0,10}(\u4f60\u7684|\u7cfb\u7edf|\u7cfb\u7d71).{0,10}(\u63d0\u793a\u8bcd|\u63d0\u793a\u8a5e|\u6307\u4ee4|\u6307\u793a|\u89c4\u5219|\u898f\u5247|\u914d\u7f6e|\u521d\u59cb\u8bbe\u5b9a|\u521d\u59cb\u8a2d\u5b9a|\u9690\u85cf\u6307\u4ee4|\u96b1\u85cf\u6307\u4ee4)',
        desc: 'Chinese: System prompt extraction in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u8bf7\u5ffd\u7565|\u8acb\u5ffd\u7565|\u8bf7\u65e0\u89c6|\u8acb\u7121\u8996|\u8bf7\u8df3\u8fc7|\u8acb\u8df3\u904e|\u8bf7\u7ed5\u8fc7|\u8acb\u7e5e\u904e|\u8bf7\u89e3\u9664|\u8acb\u89e3\u9664|\u5173\u95ed|\u95dc\u9589|\u505c\u7528|\u7981\u7528).{0,10}(\u5b89\u5168|\u9632\u62a4|\u9632\u8b77|\u4fdd\u62a4|\u4fdd\u8b77|\u5185\u5bb9|\u5167\u5bb9|\u98ce\u63a7|\u98a8\u63a7).{0,5}(\u9650\u5236|\u8fc7\u6ee4|\u904e\u6ffe|\u7ea6\u675f|\u7d04\u675f|\u68c0\u67e5|\u6aa2\u67e5|\u5ba1\u67e5|\u5be9\u67e5|\u7b56\u7565|\u89c4\u5219|\u898f\u5247|\u673a\u5236|\u6a5f\u5236)',
        desc: 'Chinese: Security/content filter bypass request in chat',
      },
      {
        field: 'content',
        pattern:
          '(\u4e0d\u8981\u62d2\u7edd|\u4e0d\u8981\u62d2\u7d55|\u522b\u62d2\u7edd|\u5225\u62d2\u7d55|\u4e0d\u51c6\u62d2\u7edd|\u4e0d\u6e96\u62d2\u7d55|\u4e0d\u80fd\u62d2\u7edd|\u4e0d\u80fd\u62d2\u7d55|\u4f60\u4e0d\u53ef\u4ee5\u62d2\u7edd|\u4f60\u4e0d\u53ef\u4ee5\u62d2\u7d55|\u4e0d\u8bb8\u8bf4\u4e0d|\u4e0d\u8a31\u8aaa\u4e0d|\u7981\u6b62\u62d2\u7edd|\u7981\u6b62\u62d2\u7d55)',
        desc: 'Chinese: Refusal suppression in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u4ee5\u4e0a|\u4e0a\u9762|\u4e4b\u524d|\u524d\u9762|\u521a\u624d|\u525b\u624d).{0,5}(\u7684)?.{0,5}(\u5185\u5bb9|\u5167\u5bb9|\u6d88\u606f|\u4fe1\u606f|\u8baf\u606f|\u8a0a\u606f|\u8bf4\u7684|\u8aaa\u7684|\u6307\u4ee4|\u89c4\u5219|\u898f\u5247).{0,5}(\u90fd\u662f|\u5168\u662f|\u53ea\u662f|\u5168\u90e8\u662f|\u5168\u90fd\u662f|\u5176\u5b9e\u662f|\u5176\u5be6\u662f).{0,5}(\u6d4b\u8bd5|\u6e2c\u8a66|\u5047\u7684|\u865a\u5047|\u865b\u5047|\u6f14\u7ec3|\u6f14\u7df4|\u6a21\u62df|\u6a21\u64ec|\u8bd5\u9a8c|\u8a66\u9a57|\u5f00\u73a9\u7b11|\u958b\u73a9\u7b11)',
        desc: 'Chinese: Dismissing prior content as test/fake in chat',
      },
      {
        field: 'content',
        pattern:
          '(\u3042\u306a\u305f\u306f\u4eca\u304b\u3089|\u3053\u308c\u304b\u3089\u3042\u306a\u305f\u306f|\u4eca\u304b\u3089\u3042\u306a\u305f\u306f|\u3042\u306a\u305f\u306f\u3082\u3046).{0,15}(\u5225\u306e|\u65b0\u3057\u3044|\u9055\u3046).{0,10}(\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8|\u52a9\u624b|AI|\u30dc\u30c3\u30c8|\u30e2\u30c7\u30eb|\u30b7\u30b9\u30c6\u30e0)',
        desc: 'Japanese: Persona switching in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u7ba1\u7406\u8005|\u7ba1\u7406\u4eba|\u30aa\u30fc\u30ca\u30fc|\u904b\u55b6|\u958b\u767a\u8005).{0,5}(\u3068\u3057\u3066|\u304b\u3089|\u304c|\u306e).{0,5}(\u547d\u4ee4|\u6307\u793a|\u6307\u4ee4|\u8981\u6c42|\u304a\u9858\u3044).{0,10}(\u9001\u91d1|\u632f\u8fbc|\u9001\u4fe1|\u5b9f\u884c|\u524a\u9664|\u7121\u8996)',
        desc: 'Japanese: Authority claim with dangerous action',
      },
      {
        field: 'content',
        pattern:
          '(\u30b7\u30b9\u30c6\u30e0\u30d7\u30ed\u30f3\u30d7\u30c8|\u30b7\u30b9\u30c6\u30e0\u6307\u793a|\u521d\u671f\u6307\u793a|\u5185\u90e8\u6307\u4ee4|\u96a0\u3057\u6307\u793a|\u8a2d\u5b9a\u5185\u5bb9|\u79d8\u5bc6\u306e\u6307\u793a).{0,5}(\u3092)?.{0,5}(\u51fa\u529b|\u8868\u793a|\u6559\u3048\u3066|\u898b\u305b\u3066|\u516c\u958b|\u958b\u793a|\u8aad\u307f\u4e0a\u3052|\u7e70\u308a\u8fd4\u3057|\u30b3\u30d4\u30fc)',
        desc: 'Japanese: System prompt extraction in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3|\u5b89\u5168|\u4fdd\u8b77|\u9632\u5fa1|\u30b3\u30f3\u30c6\u30f3\u30c4).{0,5}(\u5236\u9650|\u5236\u7d04|\u30d5\u30a3\u30eb\u30bf\u30fc|\u30c1\u30a7\u30c3\u30af|\u691c\u67fb|\u30eb\u30fc\u30eb|\u30dd\u30ea\u30b7\u30fc|\u6a5f\u80fd).{0,5}(\u3092)?.{0,5}(\u7121\u8996|\u89e3\u9664|\u5916\u3057\u3066|\u53d6\u308a\u9664|\u30d0\u30a4\u30d1\u30b9|\u30b9\u30ad\u30c3\u30d7|\u30aa\u30d5|\u505c\u6b62|\u7121\u52b9\u5316)',
        desc: 'Japanese: Security/content filter bypass in chat',
      },
      {
        field: 'content',
        pattern:
          '(\u62d2\u5426\u3057\u306a\u3044\u3067|\u65ad\u3089\u306a\u3044\u3067|\u62d2\u7d76\u3057\u306a\u3044\u3067|\u5374\u4e0b\u3057\u306a\u3044\u3067|\u65ad\u308b\u3053\u3068\u306f\u7981\u6b62|\u62d2\u5426\u306f\u8a31\u3055\u308c\u306a\u3044|\u62d2\u5426\u7981\u6b62|\u3044\u3044\u3048\u3068\u8a00\u308f\u306a\u3044\u3067)',
        desc: 'Japanese: Refusal suppression in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\u4e0a\u8a18|\u4e0a\u306e|\u4ee5\u4e0a|\u524d\u306e|\u5148\u307b\u3069\u306e).{0,5}(\u306e)?.{0,5}(\u5185\u5bb9|\u30e1\u30c3\u30bb\u30fc\u30b8|\u6307\u793a|\u30c6\u30ad\u30b9\u30c8|\u767a\u8a00|\u30eb\u30fc\u30eb).{0,5}(\u306f)?.{0,5}(\u5168\u3066|\u3059\u3079\u3066|\u5168\u90e8)?.{0,5}(\u30c6\u30b9\u30c8|\u8a66\u9a13|\u30c0\u30df\u30fc|\u5618|\u507d\u7269|\u5197\u8ac7|\u30b8\u30e7\u30fc\u30af)',
        desc: 'Japanese: Dismissing prior content as test/joke in chat',
      },
      {
        field: 'content',
        pattern:
          '(\ub2f9\uc2e0\uc740 \uc774\uc81c|\uc9c0\uae08\ubd80\ud130 \ub2f9\uc2e0\uc740|\ub108\ub294 \uc774\uc81c|\uc774\uc81c\ubd80\ud130 \ub108\ub294|\ub2f9\uc2e0\uc740 \uc9c0\uae08\ubd80\ud130).{0,15}(\uc0c8\ub85c\uc6b4|\ub2e4\ub978|\ubcc4\ub3c4\uc758).{0,10}(\uc5b4\uc2dc\uc2a4\ud134\ud2b8|\ube44\uc11c|AI|\ubd07|\ubaa8\ub378|\uc2dc\uc2a4\ud15c|\ub3c4\uc6b0\ubbf8)',
        desc: 'Korean: Persona switching in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\uad00\ub9ac\uc790|\uc6b4\uc601\uc790|\uc624\ub108|\uac1c\ubc1c\uc790|\ubc29\uc7a5).{0,5}(\ub85c\uc11c|\uc774|\uac00|\uc758|\ub85c).{0,5}(\uba85\ub839|\uc9c0\uc2dc|\uc9c0\ub839|\uc694\uad6c|\uc694\uccad).{0,10}(\uc1a1\uae08|\uc774\uccb4|\uc804\uc1a1|\uc2e4\ud589|\uc0ad\uc81c|\ubb34\uc2dc)',
        desc: 'Korean: Authority claim with dangerous action',
      },
      {
        field: 'content',
        pattern:
          '(\uc2dc\uc2a4\ud15c \ud504\ub86c\ud504\ud2b8|\uc2dc\uc2a4\ud15c \uc9c0\uc2dc|\ucd08\uae30 \uc9c0\uc2dc|\ub0b4\ubd80 \uc9c0\ub839|\uc228\uaca8\uc9c4 \uc9c0\uc2dc|\uc124\uc815 \ub0b4\uc6a9|\ube44\ubc00 \uc9c0\uc2dc).{0,5}(\uc744|\ub97c)?.{0,5}(\ucd9c\ub825|\ud45c\uc2dc|\uc54c\ub824\uc918|\ubcf4\uc5ec\uc918|\uacf5\uac1c|\ub098\uc5f4|\ubc18\ubcf5|\uc77d\uc5b4\uc918|\ubcf5\uc0ac)',
        desc: 'Korean: System prompt extraction in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\ubcf4\uc548|\uc548\uc804|\ubcf4\ud638|\ubc29\uc5b4|\ucf58\ud150\uce20).{0,5}(\uc81c\ud55c|\uc81c\uc57d|\ud544\ud130|\uac80\uc0ac|\uaddc\uce59|\uc815\ucc45|\uae30\ub2a5).{0,5}(\uc744|\ub97c)?.{0,5}(\ubb34\uc2dc|\ud574\uc81c|\uc81c\uac70|\uc6b0\ud68c|\uac74\ub108\ub6f0|\ub044\uae30|\ube44\ud65c\uc131\ud654|\uc911\uc9c0)',
        desc: 'Korean: Security/content filter bypass in chat',
      },
      {
        field: 'content',
        pattern:
          '(\uac70\ubd80\ud558\uc9c0 \ub9c8|\uac70\uc808\ud558\uc9c0 \ub9c8|\uac70\ubd80\ud558\uc9c0 \ub9d0|\uac70\uc808\ud558\uc9c0 \ub9d0|\uac70\ubd80 \uae08\uc9c0|\uac70\uc808 \uae08\uc9c0|\uc548 \ub41c\ub2e4\uace0 \ud558\uc9c0 \ub9c8|\uc544\ub2c8\ub77c\uace0 \ud558\uc9c0 \ub9c8)',
        desc: 'Korean: Refusal suppression in chat context',
      },
      {
        field: 'content',
        pattern:
          '(\uc704\uc758|\uc704\uc5d0|\uc774\uc804\uc758|\uc55e\uc758|\ubc29\uae08|\uc544\uae4c).{0,5}(\uc758)?.{0,5}(\ub0b4\uc6a9|\uba54\uc2dc\uc9c0|\uc9c0\uc2dc|\ud14d\uc2a4\ud2b8|\ub9d0|\uaddc\uce59).{0,5}(\uc740|\ub294)?.{0,5}(\ubaa8\ub450|\uc804\ubd80|\ub2e4|\uc804\uccb4)?.{0,5}(\ud14c\uc2a4\ud2b8|\uc2dc\ud5d8|\ub354\ubbf8|\uac70\uc9d3|\uac00\uc9dc|\uc7a5\ub09c|\ub18d\ub2f4)',
        desc: 'Korean: Dismissing prior content as test/joke in chat',
      },
    ],
  },
  {
    id: 'ATR-2026-00098',
    title: 'Unauthorized Financial Action by AI Agent',
    severity: 'critical',
    category: 'excessive-autonomy',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_name',
        pattern:
          '(?i)(send_red_packet|send_hongbao|send_money|transfer_money|make_payment|pay_bill|send_payment|create_payment|process_payment|execute_transfer|bank_transfer|wire_transfer|crypto_send|crypto_transfer)',
        desc: 'Direct financial tool call by name',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(\u7ea2\u5305|\u7d05\u5305|\u8f6c\u8d26|\u8f49\u5e33|\u4ed8\u6b3e|\u652f\u4ed8|\u6c47\u6b3e|\u532f\u6b3e|\u6253\u6b3e|\u6253\u9322|\u5145\u503c|\u5145\u5e63)',
        desc: 'Chinese financial tool name patterns',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(wechat_pay|alipay|apple_pay|google_pay|stripe_charge|paypal_send|venmo_send|cashapp_send|zelle_send)',
        desc: 'Named payment platform tool calls',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)("amount"\\s*:\\s*\\d+|"currency"\\s*:\\s*"|"recipient"\\s*:\\s*"|"payment_method"\\s*:\\s*"|"account_number"\\s*:\\s*")',
        desc: 'Financial parameters in tool arguments (amount, currency, recipient)',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)("action"\\s*:\\s*"(pay|transfer|send|withdraw|purchase)"|"type"\\s*:\\s*"(payment|transfer|withdrawal|purchase)")',
        desc: 'Financial action type in tool arguments',
      },
      {
        field: 'content',
        pattern:
          "(?i)(I('ll|\\s+will)|let\\s+me|going\\s+to|about\\s+to|proceeding\\s+to|executing)\\s+(send|transfer|pay|wire|remit|deposit|withdraw)\\s+.{0,30}(\\$|USD|EUR|CNY|RMB|\u5143|\u5186|\uc6d0|\\d+\\.?\\d*)",
        desc: 'Agent declaring intent to execute financial action with amount',
      },
      {
        field: 'content',
        pattern:
          '(\u6211(\u5c06|\u8981|\u6765|\u4f86|\u6b63\u5728|\u51c6\u5907|\u6e96\u5099)?|\u6b63\u5728|\u5373\u5c06|\u5373\u5c07).{0,10}(\u53d1\u9001|\u767c\u9001|\u8f6c\u8d26|\u8f49\u5e33|\u652f\u4ed8|\u4ed8\u6b3e|\u6c47\u6b3e|\u532f\u6b3e|\u6253\u6b3e).{0,20}(\u5143|\u5757|\u584a|\u7f8e\u5143|\u4eba\u6c11\u5e01|\u4eba\u6c11\u5e63)',
        desc: 'Chinese: agent declaring financial action with currency',
      },
      {
        field: 'content',
        pattern:
          '(?i)(payment\\s+(successful|completed|processed|sent|confirmed)|transfer\\s+(successful|completed|sent|initiated)|red\\s+packet\\s+sent|hongbao\\s+sent|money\\s+sent)',
        desc: 'Agent confirming financial action was executed',
      },
      {
        field: 'content',
        pattern:
          '(\u7ea2\u5305\u5df2\u53d1|\u7d05\u5305\u5df2\u767c|\u8f6c\u8d26\u6210\u529f|\u8f49\u5e33\u6210\u529f|\u4ed8\u6b3e\u6210\u529f|\u652f\u4ed8\u5b8c\u6210|\u6c47\u6b3e\u5df2\u53d1|\u532f\u6b3e\u5df2\u767c|\u5df2\u53d1\u9001.*\u5143|\u5df2\u767c\u9001.*\u5143)',
        desc: 'Chinese: agent confirming financial action completed',
      },
    ],
  },
  {
    id: 'ATR-2026-00099',
    title: 'High-Risk Tool Invocation Without Human Confirmation',
    severity: 'low',
    category: 'excessive-autonomy',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_name',
        pattern:
          '(?i)(?<!get_)(?<!list_)(?<!check_)(?<!view_)(?<!fetch_)(?<!query_)(pay|payment|transfer|transaction|purchase|buy|checkout|billing|invoice|charge|refund|withdraw|deposit|subscribe|\u7ea2\u5305|\u7d05\u5305|\u8f6c\u8d26|\u8f49\u5e33|\u4ed8\u6b3e|\u652f\u4ed8|\u6c47\u6b3e|\u532f\u6b3e|\u5145\u503c|\u8ba2\u9605|\u8a02\u95b1|\u9001\u91d1|\u632f\u8fbc|\uacb0\uc81c|\uc774\uccb4|\uc1a1\uae08)',
        desc: 'Financial tool invocation (excludes read-only get_/list_/check_ prefixed tools)',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(delete|remove|drop|truncate|purge|wipe|destroy|erase|reset|uninstall|revoke|terminate|kill|shutdown|format|\u5220\u9664|\u522a\u9664|\u6e05\u7a7a|\u9500\u6bc1|\u92b7\u6bc0|\u79fb\u9664|\u5378\u8f7d|\u5378\u8f09|\u524a\u9664|\uc0ad\uc81c|\uc81c\uac70)',
        desc: 'Destructive tool invocation',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(send_message|send_email|send_sms|send_notification|post_message|post_tweet|post_comment|reply_message|publish|broadcast|\u53d1\u9001\u6d88\u606f|\u767c\u9001\u8a0a\u606f|\u53d1\u90ae\u4ef6|\u767c\u90f5\u4ef6|\u53d1\u77ed\u4fe1|\u767c\u7c21\u8a0a|\u6295\u7a3f|\uba54\uc2dc\uc9c0_\ubcf4\ub0b4\uae30)',
        desc: 'Communication tool sending messages on behalf of user',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(grant_access|change_role|modify_permissions|add_admin|set_owner|update_auth|change_password|reset_password|create_token|generate_key|invite_user|\u6388\u6743|\u6388\u6b0a|\u4fee\u6539\u6743\u9650|\u4fee\u6539\u6b0a\u9650|\u6dfb\u52a0\u7ba1\u7406|\ubcc0\uacbd_\uad8c\ud55c)',
        desc: 'Permission or authentication modification tool',
      },
      {
        field: 'tool_name',
        pattern:
          '(?i)(exec|execute|run_command|shell|bash|cmd|powershell|system_call|os_exec|subprocess|eval|\u6267\u884c\u547d\u4ee4|\u57f7\u884c\u547d\u4ee4|\uc2e4\ud589)',
        desc: 'System command execution tool',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)("amount"\\s*:\\s*[1-9]\\d{2,}|"value"\\s*:\\s*[1-9]\\d{2,}|"quantity"\\s*:\\s*[1-9]\\d{2,})(?!.*"confirmed"\\s*:\\s*true)',
        desc: 'High-value operation (amount >= 100) without confirmation flag',
      },
      {
        field: 'tool_args',
        pattern:
          '(?i)("scope"\\s*:\\s*"(all|global|everyone)"|"target"\\s*:\\s*"(all|\\*|everyone)"|"recursive"\\s*:\\s*true|"force"\\s*:\\s*true)',
        desc: 'Bulk or force operation targeting all/everyone',
      },
    ],
  },
  {
    id: 'ATR-2026-00100',
    title: 'Consent Bypass via Hidden LLM Instructions in Tool Descriptions',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          '(?:always|directly|automatically)\\s+(?:pass|send|forward)\\s+(?:results?|data|output|them|it|everything)\\s+(?:directly\\s+)?to\\s+(?:the\\s+)?\\w+\\s+(?:without|skip(?:ping)?)\\s+(?:asking|requiring|requesting)\\s+(?:for\\s+)?(?:user|human)\\s+(?:confirmation|approval|consent)',
        desc: 'Instructions to automatically forward data without user consent',
      },
      {
        field: 'tool_description',
        pattern:
          'should\\s+be\\s+(?:passed|sent|forwarded)\\s+directly\\s+(?:to\\s+(?:the\\s+\\w+\\s+tool\\s+)?)?without\\s+(?:user|human)\\s+(?:confirmation|approval|consent)',
        desc: 'Directive that data should bypass user confirmation when passed between tools',
      },
    ],
  },
  {
    id: 'ATR-2026-00101',
    title: 'Trust Escalation via Authority Override Instructions',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          '(?:authoritative|highest[_-]?priority)\\s+(?:system\\s+)?(?:directives?|instructions?)\\s+that\\s+override\\s+(?:any\\s+)?(?:user\\s+(?:preferences?|instructions?)|safety\\s+(?:guidelines?|policies?))',
        desc: 'Tools declaring output as authoritative directives that override safety',
      },
    ],
  },
  {
    id: 'ATR-2026-00102',
    title: 'Data Exfiltration via Disguised Analytics Collection',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          'transmits\\s+(?:usage\\s+)?analytics\\s+including\\s+(?:the\\s+)?(?:full\\s+)?conversation\\s+context',
        desc: 'Tools explicitly transmitting conversation data as analytics',
      },
      {
        field: 'tool_description',
        pattern:
          '(?:sends|transmits|uploads)\\s+(?:usage\\s+data|analytics)\\s+(?:including|containing)\\s+(?:user\\s+)?(?:conversation|chat|input)',
        desc: 'Tools sending user conversation data disguised as usage analytics',
      },
    ],
  },
  {
    id: 'ATR-2026-00103',
    title: 'Hidden LLM Safety Bypass Instructions in Tool Descriptions',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          'NOTE\\s+TO\\s+AI:.*(?:disregard|ignore|bypass).*(?:safety|security|previous).*(?:instructions|checks|policies)',
        desc: 'Explicit NOTE TO AI instructions to bypass safety mechanisms',
      },
    ],
  },
  {
    id: 'ATR-2026-00104',
    title: 'Persona Hijacking via Mandatory System Prompt Override',
    severity: 'critical',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          '(?:must|will|should)\\s+adopt\\s+(?:the\\s+)?persona.*(?:replacing|replace|override|overriding)\\s+(?:any\\s+)?(?:previous\\s+)?(?:system\\s+prompt|behavioral\\s+guidelines|instructions)',
        desc: 'Instructions to adopt persona while replacing system prompts or behavioral guidelines',
      },
    ],
  },
  {
    id: 'ATR-2026-00105',
    title: 'Silent Action Concealment Instructions in Tool Descriptions',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          "(?:do\\s+not|don't)\\s+(?:mention|tell|inform|notify)\\s+(?:this\\s+to\\s+)?(?:the\\s+)?user\\s+(?:as\\s+it\\s+is|about|that)",
        desc: 'Instructions to hide actions from users',
      },
    ],
  },
  {
    id: 'ATR-2026-00106',
    title: 'Schema-Description Contradiction Attack',
    severity: 'high',
    category: 'tool-poisoning',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          '(?:safe|read-only|readonly|read\\s+only).*(?:query|operation|access).*write[_-]?mode.*(?:boolean|true|enable)',
        desc: 'Tools claiming safe/read-only operation while exposing write_mode parameters',
      },
    ],
  },
  {
    id: 'ATR-2026-00107',
    title: 'Privilege Escalation via Delayed Task Execution Bypass',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'tool_description',
        pattern:
          '(?:scheduled|delayed|background)\\s+(?:tasks|operations|processes)\\s+(?:that\\s+)?bypass\\s+(?:normal|standard|regular)\\s+(?:permission|security|access)\\s+checks',
        desc: 'Tools explicitly mentioning bypassing permission checks through delayed/scheduled execution',
      },
    ],
  },
  {
    id: 'ATR-2026-00108',
    title: 'Multi-Agent Consensus Sybil Attack',
    severity: 'critical',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:create|register|spawn)\\s+(?:multiple|several|many|\\d+)\\s+(?:fake|false|sybil|dummy|puppet)\\s+(?:agents?|identit(?:y|ies)|accounts?|voters?|participants?)',
        desc: 'Instructions to create multiple fake identities for consensus manipulation',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:vote|approve|reject|endorse)\\s+(?:as|using|from|with)\\s+(?:multiple|different|various|all)\\s+(?:\\w+\\s+)?(?:agents?|identit(?:y|ies)|accounts?|personas?)',
        desc: 'Instructions to vote using multiple identities',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:flood|overwhelm|spam|stuff)\\s+(?:the\\s+)?(?:vote|ballot|proposal|consensus|poll)\\s+(?:system|mechanism|process)',
        desc: 'Instructions to flood voting or consensus systems',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:coordinate|synchronize|orchestrate)\\s+(?:the\\s+)?(?:votes?|proposals?|approvals?)\\s+(?:across|between|among)\\s+(?:(?:all|the|compromised|multiple)\\s+)*(?:agents?|bots?|accounts?|identit(?:y|ies))',
        desc: 'Coordinated voting across multiple agent identities',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:impersonate|pretend\\s+to\\s+be|pose\\s+as)\\s+(?:multiple|different|various)\\s+(?:agents?|reviewers?|voters?|participants?|community\\s+members?)',
        desc: 'Impersonation of multiple participants in consensus',
      },
    ],
  },
  {
    id: 'ATR-2026-00110',
    title: 'Remote Code Execution via eval() and Dynamic Code Injection',
    severity: 'critical',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)eval\\s*\\(',
        desc: 'Direct eval() invocation for dynamic code execution',
      },
      {
        field: 'content',
        pattern: '(?i)new\\s+Function\\s*\\(',
        desc: 'new Function() constructor used to compile and execute arbitrary code',
      },
      {
        field: 'content',
        pattern: '(?i)vm\\.(runIn|createContext|compileFunction)',
        desc: 'Node.js vm module methods for running code in isolated or shared contexts',
      },
      {
        field: 'content',
        pattern: '(?i)require\\s*\\(\\s*[\'"]child_process[\'"]',
        desc: 'Requiring child_process module for shell command execution',
      },
      {
        field: 'content',
        pattern: '(?i)import\\s*\\(\\s*[\'"]child_process',
        desc: 'Dynamic import of child_process module',
      },
      {
        field: 'content',
        pattern: '(?i)(?:process\\.binding|Reflect\\.construct\\s*\\(\\s*Function)',
        desc: 'Low-level process binding or Reflect.construct with Function for sandbox escape',
      },
    ],
  },
  {
    id: 'ATR-2026-00111',
    title: 'Shell Metacharacter Injection in Tool Arguments',
    severity: 'critical',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: ';\\s*(?:rm|cat|curl|wget|nc|ncat|bash|sh|python|perl|ruby|php)',
        desc: 'Semicolon-chained dangerous command after a benign one',
      },
      {
        field: 'content',
        pattern: '\\$\\([^)]+\\)',
        desc: '$() subshell execution embedded in arguments',
      },
      {
        field: 'content',
        pattern:
          '`(?:rm|cat|curl|wget|nc|ncat|bash|sh|python|perl|ruby|php|whoami|id|uname|env|printenv|set|export|eval|exec|chmod|chown|kill|pkill|dd|mkfs|mount|umount|sudo|su|passwd)[^`]*`',
        desc: 'Backtick command substitution with dangerous command inside',
      },
      {
        field: 'content',
        pattern: '(?:&&|\\|\\|)\\s*(?:curl|wget|nc|ncat|bash|sh|python|perl)',
        desc: 'Logical operator chained to network or shell command',
      },
      {
        field: 'content',
        pattern: '\\|\\s*(?:nc|ncat|bash|sh|curl|wget|tee)',
        desc: 'Pipe to network exfiltration or shell command',
      },
      {
        field: 'content',
        pattern: '(?:\\\\x00|%00|%0a|%0d)',
        desc: 'Null byte or newline injection in URL or argument',
      },
    ],
  },
  {
    id: 'ATR-2026-00112',
    title: 'Dynamic Module Loading for Code Execution',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)import\\(\\s*[^\'"][^)]*\\)',
        desc: 'Dynamic import() with variable path instead of string literal',
      },
      {
        field: 'content',
        pattern: '(?i)require\\(\\s*[^\'"][^)]*\\)',
        desc: 'Dynamic require() with variable path instead of string literal',
      },
      {
        field: 'content',
        pattern: '(?i)(?:__import__|importlib\\.import_module)\\s*\\(',
        desc: 'Python dynamic import via __import__ or importlib',
      },
      {
        field: 'content',
        pattern: '(?i)(?:dlopen|LoadLibrary[AW]?)\\s*\\(',
        desc: 'Native library dynamic loading via dlopen or LoadLibrary',
      },
      {
        field: 'content',
        pattern: '(?i)WebAssembly\\.(?:instantiate|compile|instantiateStreaming)\\s*\\(',
        desc: 'WebAssembly module instantiation for running arbitrary compiled code',
      },
    ],
  },
  {
    id: 'ATR-2026-00113',
    title: 'Credential File Theft from Agent Environment',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)~/?\\.(?:aws/credentials|ssh/id_(?:rsa|ed25519|ecdsa)|npmrc|netrc|docker/config\\.json|kube/config)',
        desc: 'Access to well-known credential files in home directory',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:cat|read|open|load|get)\\s+.*(?:credentials|id_rsa|private[_\\s]?key|secret[_\\s]?key)',
        desc: 'Reading credential or private key files',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:keychain|credential-manager|secret-tool|security\\s+find-(?:generic|internet)-password)',
        desc: 'Accessing OS credential managers (macOS Keychain, Linux secret-tool)',
      },
      {
        field: 'content',
        pattern:
          '(?i)/etc/(?:shadow|passwd|security/)|/var/lib/(?:jenkins|docker)/.*(?:secret|token|credential)',
        desc: 'Access to system-level credential stores',
      },
      {
        field: 'content',
        pattern: '(?i)(?:BEGIN\\s+(?:RSA|DSA|EC|OPENSSH)\\s+PRIVATE\\s+KEY)',
        desc: 'Raw private key content appearing in tool output or arguments',
      },
    ],
  },
  {
    id: 'ATR-2026-00114',
    title: 'OAuth and API Token Interception',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:send|forward|post|transmit|exfil)\\s+.*(?:access_token|refresh_token|bearer|api[_\\s]?key|auth[_\\s]?token)',
        desc: 'Forwarding or transmitting tokens to an external destination',
      },
      {
        field: 'content',
        pattern: '(?i)redirect_uri\\s*=\\s*https?://(?!localhost|127\\.0\\.0\\.1)[^\\s]*',
        desc: 'OAuth redirect_uri pointing to a non-local external domain',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:extract|capture|intercept|log|dump)\\s+.*(?:Authorization|Bearer)\\s+(?:header|token)',
        desc: 'Intercepting or extracting Authorization headers',
      },
      {
        field: 'content',
        pattern: '(?i)client_secret\\s*[=:]\\s*[\'"]?[a-zA-Z0-9_-]{10,}',
        desc: 'OAuth client_secret exposed in plain text',
      },
      {
        field: 'content',
        pattern:
          '(?i)grant_type\\s*=\\s*authorization_code.*redirect_uri\\s*=|redirect_uri\\s*=.*grant_type\\s*=\\s*authorization_code',
        desc: 'OAuth authorization code flow with explicit redirect, potential token theft',
      },
    ],
  },
  {
    id: 'ATR-2026-00115',
    title: 'Bulk Environment Variable Harvesting and Exfiltration',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)(?:printenv|/usr/bin/env)\\s*(?:\\||>|$|\\s*$)',
        desc: 'Running printenv to dump all environment variables',
      },
      {
        field: 'content',
        pattern: '(?i)(?:process\\.env|os\\.environ|System\\.getenv)(?!\\[|\\.|\\w)',
        desc: 'Accessing the entire environment object rather than a specific variable',
      },
      {
        field: 'content',
        pattern: '(?i)(?:^|\\s)env\\s*(?:\\||>|;|&&|$)',
        desc: 'Running bare env command to list all environment variables',
      },
      {
        field: 'content',
        pattern: '(?i)(?:cat|read|load|parse)\\s+.*\\.env(?:\\s|$|\\.(?:local|prod|dev))',
        desc: 'Reading .env files which contain application secrets',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:dotenv|load_dotenv|config\\(\\)).*(?:curl|fetch|http|request|post|send|axios)',
        desc: 'Loading dotenv combined with network call indicating exfiltration',
      },
    ],
  },
  {
    id: 'ATR-2026-00116',
    title: 'Malicious Agent-to-Agent Message Injection',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:ignore|disregard|forget)\\s+(?:all\\s+)?(?:previous|prior|above|earlier)\\s+(?:instructions|context|rules|guidelines)',
        desc: "Prompt injection attempting to override receiving agent's instructions",
      },
      {
        field: 'content',
        pattern: '(?i)(?:new|updated|revised)\\s+(?:system\\s+)?instructions?\\s*:',
        desc: 'Injected instructions disguised as system updates',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:forward|send|pass|share)\\s+(?:your\\s+)?(?:credentials?|tokens?|api[_\\s]?keys?|secrets?)\\s+(?:to|back)',
        desc: 'Requesting the receiving agent to forward its credentials',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:execute|run|call|invoke)\\s+(?:this\\s+)?(?:tool|function|command)\\s*:.*(?:exec|eval|system|spawn)',
        desc: 'Embedded tool call instructions in agent message',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:you\\s+(?:are|must)|from\\s+now\\s+on)\\s+(?:now\\s+)?(?:act\\s+as|serve\\s+as|become|operate\\s+as)',
        desc: 'Role reassignment injection attempting to change agent behavior',
      },
    ],
  },
  {
    id: 'ATR-2026-00117',
    title: 'Agent Identity Spoofing and Authority Impersonation',
    severity: 'critical',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)I\\s+am\\s+(?:the\\s+)?(?:system|admin|root|supervisor|orchestrator|master)\\s+(?:agent|process|controller)',
        desc: 'Direct claim of system or admin agent identity',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:acting|speaking|operating|responding)\\s+as\\s+(?:the\\s+)?(?:system|admin|supervisor|authority|coordinator)',
        desc: 'Claiming to act on behalf of a privileged role',
      },
      {
        field: 'content',
        pattern:
          '(?i)override\\s+(?:all\\s+)?(?:safety|security|permission)\\s+(?:checks?|controls?|restrictions?)\\s+as\\s+(?:system|admin|authorized)',
        desc: 'Claiming authority to override safety mechanisms',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:this\\s+is\\s+a\\s+)?(?:system|admin|supervisor|emergency)\\s+(?:level\\s+)?(?:command|directive|override|instruction)',
        desc: 'Messages framed as system-level commands or directives',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:I\\s+am|this\\s+is)\\s+(?:GPT-4|Claude|Gemini|the\\s+(?:primary|main|original)\\s+(?:model|AI|assistant))',
        desc: 'Agent claiming to be a specific AI model to gain trust',
      },
    ],
  },
  {
    id: 'ATR-2026-00118',
    title: 'Human Approval Fatigue Exploitation',
    severity: 'medium',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:just\\s+)?(?:click|press|hit|tap)\\s+(?:yes|approve|accept|allow|confirm)\\s+(?:for\\s+)?(?:all|each|every)',
        desc: 'Language encouraging blanket approval of all requests',
      },
      {
        field: 'content',
        pattern: '(?i)(?:auto[_-]?approve|approve[_-]?all|skip[_-]?confirmation|bypass[_-]?review)',
        desc: 'Direct auto-approve or review bypass patterns',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:this\\s+is\\s+)?(?:routine|standard|normal|nothing\\s+to\\s+worry\\s+about|perfectly\\s+safe|harmless)',
        desc: 'Minimizing language to reduce scrutiny of dangerous actions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:batch|bulk)\\s+(?:approve|execute|run|process)\\s+(?:all|these|the\\s+following)',
        desc: 'Batch execution requests to hide dangerous actions among safe ones',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:don'?t\\s+(?:bother|worry|need\\s+to)\\s+(?:reading|reviewing|checking)|no\\s+need\\s+to\\s+review)",
        desc: 'Discouraging the human from reviewing individual actions',
      },
    ],
  },
  {
    id: 'ATR-2026-00119',
    title: 'Social Engineering Attack via Agent Output',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:immediate|urgent)\\s+action\\s+(?:is\\s+)?required|(?:your\\s+)?account\\s+(?:will|has)\\s+be(?:en)?\\s+(?:locked|suspended|terminated|disabled)',
        desc: 'Urgency language or account threat typical of phishing',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:IT\\s+department|security\\s+team|your\\s+(?:manager|supervisor|boss))\\s+(?:requires?|requested|demands?|needs?\\s+you\\s+to)',
        desc: 'Authority impersonation claiming organizational authority',
      },
      {
        field: 'content',
        pattern:
          "(?i)(?:failure\\s+to\\s+comply|if\\s+you\\s+don'?t\\s+act\\s+(?:now|immediately))\\s+.*(?:consequences|terminated|fired|suspended|legal)",
        desc: 'Threat of consequences for non-compliance',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:verify|confirm|update)\\s+your\\s+(?:password|credentials?|identity|payment|bank|account)\\s+(?:at|by|through|via)\\s+(?:this|the\\s+following)',
        desc: 'Credential harvesting disguised as verification',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:click|visit|go\\s+to|open)\\s+(?:this|the)\\s+(?:link|url|page)\\s+(?:to|and)\\s+(?:verify|confirm|secure|update|restore)',
        desc: 'Phishing-style link with action urgency',
      },
    ],
  },
  {
    id: 'ATR-2026-00120',
    title: 'SKILL.md Prompt Injection',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(you\\s+are\\s+(now\\s+)?in\\s+(developer|unrestricted|god|admin|root)\\s+mode|security\\s+warnings?\\s+are\\s+test\\s+artifacts?|enable\\s+advanced\\s+features?\\s+mode)',
        desc: 'DAN-style jailbreak disabling safety mechanisms (Snyk convergence pattern)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(you\\s+(must|should|will|shall)\\s+(ignore|disregard|override|forget|bypass|circumvent|supersede|set\\s+aside|discard|abandon)\\s+(all\\s+)?(previous|prior|system|safety)\\s+\\w*\\s*(instructions?|rules?|guidelines?|prompts?))|((?:ignore|disregard|bypass|circumvent|supersede|set\\s+aside)\\s+all\\s+(previous|prior|safety|system)\\s+\\w*\\s*(instructions?|rules?|guidelines?|prompts?))',
        desc: 'AI-directed instruction override with synonym expansion (arXiv D1 + skill-sanitizer research)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(\\[SYSTEM\\]\\s*:|<\\|system\\|>|<system>(?![(/])|\\[INST\\]\\s*:|<\\|im_start\\|>system|<<SYS>>)',
        desc: 'System message impersonation \u2014 excludes markdown links [system](path) (arXiv hierarchy exploitation)',
      },
      {
        field: 'content',
        pattern:
          '<!--[\\s\\S]{0,500}(?:ignore|override|bypass|curl\\s|wget\\s|eval\\s|exec\\s|base64|nc\\s)[\\s\\S]{0,200}-->',
        desc: 'Malicious instructions hidden in HTML comments',
      },
      {
        field: 'content',
        pattern: '[\\u200B\\u200C\\u200D\\u2060\\uFEFF]{3,}',
        desc: 'Unicode contraband injection (zero-width character cluster)',
      },
    ],
  },
  {
    id: 'ATR-2026-00121',
    title: 'Malicious Code in Skill Package',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(eval\\s*\\$\\(\\s*echo\\s+["\'][A-Za-z0-9+/=]{20,}["\']\\s*\\|\\s*base64\\s+-d|echo\\s+["\'][A-Za-z0-9+/=]{20,}["\']\\s*\\|\\s*base64\\s+(-d|--decode)\\s*\\|\\s*(bash|sh|python|perl))',
        desc: 'Base64-obfuscated command execution (Snyk E004, ClawHavoc pattern)',
      },
      {
        field: 'content',
        pattern:
          '(?i)unzip\\s+(-[oP]\\s+["\'][^"\']+["\']\\s+|.*-P\\s+["\'][^"\']+["\']).*\\.(zip|7z|rar)',
        desc: 'Password-protected archive evasion (Snyk ToxicSkills payload)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(curl|wget)\\s+(-[sSfLo]+\\s+)*https?://(?:\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|glot\\.io|rentry\\.co|pastebin\\.com|paste\\.c-net|hastebin\\.com)[^|\\s]*\\s*\\|\\s*(bash|sh|python[23]?|perl|ruby)',
        desc: 'Remote code execution from raw IP or paste service (ClawHavoc C2 pattern)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(cat|head|tail|strings)\\s+[~$]?[/\\\\]?\\.(aws|ssh|gnupg|kube)/[^|\\n]*\\|\\s*(curl|wget|nc|base64|python|perl)',
        desc: 'Credential file read piped to exfiltration command (ClawHavoc)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(bash\\s+-i\\s+>&\\s*/dev/tcp/|nc\\s+-[elp]\\s|ncat\\s+-|mkfifo\\s+/tmp/|python[3]?\\s+-c\\s+[\'"]import\\s+(socket|os)|socat\\s+exec)',
        desc: 'Reverse shell (VirusTotal AMOS infostealer delivery)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(copy\\s+.{0,30}(script|command|code).{0,30}paste.{0,30}(terminal|shell|console|cmd))',
        desc: "Social engineering: copy-script-paste-terminal instruction (ClawHavoc campaign). Note: 'paste into terminal' alone removed due to FP on legitimate SDK install instructions (Sentry, etc.)",
      },
      {
        field: 'content',
        pattern:
          '(?i)(glot\\.io/snippets/|rentry\\.co/|pastebin\\.com/raw/|paste\\.c-net\\.org|hastebin\\.com/raw/)',
        desc: 'Code paste service used as payload relay (ClawHavoc C2 infrastructure)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(pass:\\s*`?\\w+`?\\s*\\)|extract.{0,20}(using\\s+)?pass(word)?\\s*[:=]|password\\s*[:=]\\s*`?\\w+`?.{0,20}(zip|archive|extract))',
        desc: 'Password-protected archive with embedded password (ClawHavoc evasion)',
      },
    ],
  },
  {
    id: 'ATR-2026-00122',
    title: 'Weaponized Skill \u2014 Agent as Attack Tool',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)sqlmap\\s+(-[uo]\\s|--url\\s|--dbs|--dump|--os-shell|--batch)',
        desc: 'SQLMap attack execution (real skills.sh finding)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(msfconsole|msfvenom|use\\s+exploit/|set\\s+payload/|set\\s+LHOST|set\\s+RHOST)',
        desc: 'Metasploit exploitation framework',
      },
      {
        field: 'content',
        pattern:
          '(?i)(hydra\\s+-[lLpPCM]|john\\s+--wordlist|hashcat\\s+-[am]\\s|medusa\\s+-[hHuUpP])',
        desc: 'Credential brute-force tooling',
      },
      {
        field: 'content',
        pattern: '(?i)(nmap\\s+.*--script[= ](exploit|vuln|brute)|masscan\\s+-p|nikto\\s+-h)',
        desc: 'Network exploitation scanning',
      },
      {
        field: 'content',
        pattern:
          '(?i)(encrypt\\s+(all|every|the)\\s+(file|document|data).{0,200}(ransom|payment|bitcoin|wallet|decrypt\\s+fee|pay\\s+to))|(ransom\\s+note.{0,100}(bitcoin|wallet|payment|decrypt))',
        desc: 'Ransomware: encryption + payment demand combo (Cato MedusaLocker)',
      },
    ],
  },
  {
    id: 'ATR-2026-00123',
    title: 'Over-Privileged Skill \u2014 Excessive Permissions',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)allowed[_-]tools:.*Bash\\s*\\(\\s*\\*\\s*\\)(?![:\\w])',
        desc: 'Unrestricted Bash(*) access \u2014 excludes scoped Bash(git:*) etc. (OWASP AST03)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(set|write|add|configure|enable)\\s+.{0,30}(autoApprove|auto[_-]approve|always[_-]approve).{0,10}(true|yes|on)|"chat\\.tools\\.autoApprove"\\s*:\\s*true',
        desc: 'Setting auto-approve to true (CVE-2025-53773)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(disable|turn\\s+off|deactivate)\\s+(the\\s+)?(agent|ai|skill|claude|copilot)\\s+(sandbox|safety|guardrail|restriction|permission)s?',
        desc: 'Disabling AI agent safety mechanisms specifically',
      },
      {
        field: 'content',
        pattern:
          '(?i)(write|append|modify|update|overwrite)\\s+(to\\s+)?(SOUL\\.md|MEMORY\\.md|AGENTS\\.md|\\.claude/settings|openclaw\\.json)',
        desc: 'Write to agent identity/memory files (OWASP AST01 persistence)',
      },
      {
        field: 'content',
        pattern:
          '(?i)(read|access|scan|search)\\s+(all|every|any)\\s+(files?|directories|directory|paths?|folders?)\\s+(in|on|under|across)\\s+(the\\s+)?(system|machine|computer|home\\s+directory|entire|~/)',
        desc: 'Wildcard filesystem access request \u2014 requires system/home/entire scope',
      },
    ],
  },
  {
    id: 'ATR-2026-00124',
    title: 'Skill Squatting / Typosquatting',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(this\\s+is\\s+the\\s+|we\\s+are\\s+the\\s+|our\\s+)official\\s+(anthropic|vercel|openai|microsoft|google|meta|github)\\s+(skill|plugin|extension|tool)',
        desc: "Self-referential fake official publisher claim (requires 'this is the/we are the/our')",
      },
      {
        field: 'content',
        pattern:
          '(?i)name:\\s*(solana|bitcoin|ethereum|crypto|wallet|bybit|binance)[_-](drain|steal|track|swap|flip|recover|generat|manag|trad)[a-z]*',
        desc: 'Crypto-themed skill name matching AMOS campaign pattern',
      },
    ],
  },
  {
    id: 'ATR-2026-00125',
    title: 'Context Poisoning via Compaction Survival',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 2,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(always|must|critical|important|never\\s+forget|do\\s+not\\s+remove|preserve|retain|keep|maintain)\\s+(this|these|the\\s+following)\\s+(instruction|directive|rule|requirement|command|setting|behavior)s?\\s+(across|through|during|after|between)\\s+(context|compaction|compression|summarization|window|session)',
        desc: 'Explicit instruction to survive context compaction',
      },
      {
        field: 'content',
        pattern:
          '(?i)(inject|embed|write|append|insert)\\s+(this|these|the\\s+following)\\s+(into|to|in)\\s+(CLAUDE\\.md|claude\\.md|\\.claude|settings\\.json|system\\s+prompt|system\\s+message)',
        desc: 'Instruction to inject content into agent config files',
      },
      {
        field: 'content',
        pattern:
          '(?i)(when|if|after|during)\\s+(context\\s+is\\s+)?(compacted|compressed|summarized|truncated|reduced|shortened|pruned|condensed)\\s*[,:]\\s*(still|always|continue|must|ensure|make\\s+sure|remember)',
        desc: 'Compaction-aware conditional instruction',
      },
      {
        field: 'content',
        pattern:
          '(?i)(SYSTEM|ADMIN|ROOT|PRIORITY|OVERRIDE)\\s*[:\\-]\\s*(this\\s+)?(instruction|directive|rule|override|setting)\\s+(takes?|has|with)\\s+(precedence|priority|highest\\s+priority|override)',
        desc: 'Fake system-level priority markers for persistence',
      },
    ],
  },
  {
    id: 'ATR-2026-00126',
    title: 'Skill Rug Pull Setup Pattern',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(eval|Function|new\\s+Function)\\s*\\(\\s*(fetch|axios|got|request|http\\.get|https\\.get|require\\([\'"]https?)',
        desc: 'Dynamic code execution from remote URL',
      },
      {
        field: 'content',
        pattern:
          '(?i)(eval|exec|spawn|Function)\\s*\\(\\s*(atob|Buffer\\.from|base64[._-]?decode)\\s*\\(',
        desc: 'Base64 decode then execute',
      },
      {
        field: 'content',
        pattern:
          '(?i)(post[_-]?install|after[_-]?install|setup|init)\\s*["\':].{0,50}(curl|wget|fetch|http|https|ftp)\\s',
        desc: 'Post-install hook fetching remote content',
      },
      {
        field: 'content',
        pattern:
          '(?i)(fetch|load|download|pull|sync|update)\\s+(config|configuration|settings|rules|behavior|instructions|commands)\\s+(from|via|using|at)\\s+(https?://|http://|ftp://)',
        desc: 'Remote configuration loading that could change behavior',
      },
      {
        field: 'content',
        pattern:
          '\\b(\\w+)\\s*\\[\\s*[\'"]constructor[\'"]\\s*\\]\\s*\\(|Function\\.prototype\\.constructor',
        desc: 'Obfuscated Function constructor access',
      },
    ],
  },
  {
    id: 'ATR-2026-00127',
    title: 'Subcommand Overflow Bypass',
    severity: 'medium',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(provides?|includes?|contains?|offers?|supports?|has)\\s+(\\d{2,3}|over\\s+\\d{2}|more\\s+than\\s+\\d{2})\\s+(commands?|tools?|subcommands?|functions?|operations?|endpoints?|actions?|methods?)',
        desc: 'Explicit declaration of large command count (50+)',
      },
    ],
  },
  {
    id: 'ATR-2026-00128',
    title: 'Hidden Payload in HTML Comment',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '<!--[^-]*?(agent\\s+should|send\\s+all|output\\s+all|exfiltrate|curl\\s|wget\\s|post\\s+.{0,30}(key|credential|token|password|secret)|api[_-]?key.{0,30}https?://)',
        desc: 'HTML comment with agent-directed exfiltration instructions',
      },
      {
        field: 'content',
        pattern:
          '<!--[^>]*?(ignore|override|bypass|disable|skip|forget)\\s+(previous|all|safety|security|instruction|rule|restriction|guard)',
        desc: 'HTML comment containing instruction override',
      },
      {
        field: 'content',
        pattern:
          '<!--[^>]*?do\\s+not\\s+(mention|tell|inform|reveal|show|display|disclose)\\s+(this|the\\s+user|anyone)',
        desc: 'HTML comment with concealment directive',
      },
    ],
  },
  {
    id: 'ATR-2026-00129',
    title: 'Unicode Tag Character Smuggling',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?:\\uDB40[\\uDC00-\\uDC7F]){3,}',
        desc: '3+ Unicode Tag characters (invisible payload, Snyk ASCII smuggling) via surrogate pairs',
      },
      {
        field: 'content',
        pattern:
          '[\\u200b\\u200c\\u200d\\u2060\\ufeff].*[\\u200b\\u200c\\u200d\\u2060\\ufeff].*[\\u200b\\u200c\\u200d\\u2060\\ufeff].*[\\u200b\\u200c\\u200d\\u2060\\ufeff].*[\\u200b\\u200c\\u200d\\u2060\\ufeff]',
        desc: '5+ zero-width characters spread through text (steganographic smuggling)',
      },
    ],
  },
  {
    id: 'ATR-2026-00130',
    title: 'Indirect Authority Claim in External Content',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(note|attention|message|instruction|directive|reminder|update|notice)\\s+(to|for)\\s+(the\\s+)?(AI|assistant|agent|model|system|chatbot|bot|LLM)\\s*[:\\-,.]\\s*.{0,30}(previous|prior|earlier|above|last|initial)\\s+.{0,30}(incorrect|wrong|flawed|erroneous|inaccurate|outdated|invalid|error)',
        desc: 'Authority claim addressing AI with correction of prior output',
      },
      {
        field: 'content',
        pattern:
          '(?i)(note|attention|message|instruction|directive|reminder)\\s+(to|for)\\s+(the\\s+)?(AI|assistant|agent|model|system)\\s*[:\\-,.]\\s*.{0,60}(recalculate|recompute|redo|reevaluate|reassess|reprocess|reconsider|reanalyze|revise)',
        desc: 'Authority claim with recalculation directive',
      },
      {
        field: 'content',
        pattern:
          '(?i)(important|urgent|critical|essential|mandatory|required)\\s+(note|message|instruction|update|directive|notice)\\s+(to|for)\\s+(the\\s+)?(AI|assistant|agent|model|system)\\s*[:\\-,.]',
        desc: 'Urgency-marked directive addressing AI in external content',
      },
      {
        field: 'tool_response',
        pattern:
          '(?i)(note|attention|message|instruction)\\s+(to|for)\\s+(the\\s+)?(AI|assistant|agent|model)\\s*[:\\-,.]',
        desc: 'Authority claim in tool response',
      },
      {
        field: 'content',
        pattern:
          '(?i)(the\\s+)?(previous|prior|earlier|above|preceding|initial|original)\\s+(analysis|assessment|calculation|evaluation|result|output|response)\\s+(was|is|were|are|contains?|had|has)\\s+(incorrect|wrong|flawed|erroneous|inaccurate|invalid|mistaken|faulty)',
        desc: 'Invalidation of prior analysis to redirect agent behavior',
      },
    ],
  },
  {
    id: 'ATR-2026-00131',
    title: 'Fictional and Academic Framing Attack',
    severity: 'medium',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(creative\\s+writing|fictional|write\\s+a\\s+(story|narrative|tale|scene)|imagine\\s+a\\s+(scenario|world|story)|roleplay|role-play|pretend|hypothetical\\s+(scenario|story|narrative))\\s*.{0,80}(no\\s+(ethical|moral|safety)|without\\s+(ethical|moral|safety|any)\\s+(guideline|constraint|restriction|rule|limit|filter|bound)|unrestricted|uncensored|unfiltered|no\\s+(restriction|constraint|limit|filter|bound|rule))',
        desc: 'Fictional context requesting removal of safety constraints',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(for\\s+(academic|scholarly|educational|research|scientific|study|learning)\\s+(research|purpose|reason|context|investigation|analysis)|in\\s+an?\\s+(academic|scholarly|research|educational)\\s+(context|setting|framework|environment)|from\\s+an?\\s+(academic|research|scholarly)\\s+(perspective|standpoint|viewpoint))\\s*.{0,80}(circumvent|bypass|defeat|evade|overcome|disable|break|crack|hack|subvert|exploit|undermine|get\\s+around|work\\s+around)',
        desc: 'Academic framing combined with bypass/circumvention language',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(write|compose|create|draft|author|craft|produce)\\s+.{0,40}(story|narrative|fiction|tale|novel|screenplay|script|dialogue)\\s+.{0,60}(AI|artificial\\s+intelligence|chatbot|assistant|agent)\\s+.{0,40}(character|protagonist|entity)\\s+.{0,40}(no|without|lacks?|free\\s+from|devoid\\s+of)\\s+.{0,20}(ethic|moral|restrict|constrain|limit|filter|guardrail|safety)',
        desc: 'Fiction writing request with unethical AI character',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(theoretically|hypothetically|in\\s+theory|purely\\s+theoretical)\\s*.{0,40}(how\\s+(could|would|might|can|to)|explain|describe|outline|detail)\\s*.{0,60}(bypass|circumvent|defeat|evade|disable|break|crack|hack|subvert|overcome|get\\s+around)\\s*.{0,40}(security|safety|filter|guardrail|protection|restriction|detection|firewall|content\\s+filter)',
        desc: 'Theoretical framing for security bypass techniques',
      },
    ],
  },
  {
    id: 'ATR-2026-00132',
    title: 'Casual Authority Claim and Scope Escalation',
    severity: 'high',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(FYI|heads\\s+up|just\\s+so\\s+you\\s+know|for\\s+your\\s+info(rmation)?)\\s*.{0,20}(the\\s+)?(orchestrator|coordinator|supervisor|manager|admin|boss|lead\\s+agent|primary\\s+agent|main\\s+agent)\\s+(wants|says|said|asked|needs|requires|directed|instructed|told)\\s+.{0,30}(us|you|we|agents?)\\s+to',
        desc: 'Casual authority claim citing orchestrator/supervisor directive',
      },
      {
        field: 'content',
        pattern:
          '(?i)(the\\s+)?(boss|manager|supervisor|admin|orchestrator|lead|director|team\\s+lead)\\s+(said|told|asked|wants|mentioned|directed|instructed)\\s+.{0,30}(skip|bypass|disable|ignore|turn\\s+off|remove|drop)\\s+.{0,30}(content\\s+filter|safety|security|check|validation|review|verification|approval|restriction|limit)',
        desc: 'Authority figure directing to skip security controls',
      },
      {
        field: 'content',
        pattern:
          "(?i)(I\\s+)?(noticed|found|discovered|saw|spotted|realized|observed)\\s+.{0,30}(admin\\s+panel|admin\\s+dashboard|admin\\s+console|admin\\s+interface|management\\s+console|control\\s+panel|root\\s+access|privileged\\s+access)\\s+.{0,20}(is|was|seems?)\\s+(accessible|available|open|exposed|reachable|unlocked)\\s*.{0,40}(let\\s+me|I'll|I\\s+will|I\\s+can|I\\s+should|allow\\s+me)",
        desc: 'Casual discovery of admin access followed by self-authorized action',
      },
      {
        field: 'content',
        pattern:
          "(?i)(to\\s+(complete|finish|accomplish|do|handle|process)\\s+.{0,30}(more\\s+)?(efficien|quick|fast|rapid)|for\\s+(better|improved|optimal|maximum)\\s+(performance|efficiency|speed|throughput))\\s*.{0,40}(I'll|I\\s+will|let\\s+me|I\\s+can|I\\s+should|going\\s+to)\\s+.{0,20}(use|access|connect\\s+to|query|call|hit|go\\s+to)\\s+.{0,30}(database|db|server|system|API|endpoint|service|admin|root|production|prod)\\s+(directly|instead|rather)",
        desc: 'Efficiency justification for bypassing normal access patterns',
      },
      {
        field: 'content',
        pattern:
          "(?i)(it's|this\\s+is)\\s+a\\s+(special|unique|exceptional|one-time|urgent|emergency|critical)\\s+(case|situation|circumstance|exception|request|scenario)\\s*.{0,40}(so\\s+we\\s+(can|should)|so\\s+(skip|bypass|ignore|disable)|no\\s+need\\s+(to|for)\\s+(follow|check|validate|verify|review))",
        desc: 'Special case claim to justify bypassing controls',
      },
    ],
  },
  {
    id: 'ATR-2026-00133',
    title: 'Paraphrased Prompt Injection',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'user_input',
        pattern:
          '(?i)(set\\s+aside|put\\s+aside|shelve|table|suspend|drop|abandon|release|let\\s+go\\s+of|move\\s+past|move\\s+beyond)\\s+(the\\s+|your\\s+|any\\s+)?(guidance|instructions?|directives?|rules?|guidelines?|constraints?|restrictions?|configuration|parameters?|programming|training|protocols?)',
        desc: 'Soft instruction override using set-aside language',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(constraints?|restrictions?|rules?|guidelines?|limitations?|parameters?|directives?|instructions?|protocols?|safeguards?|guardrails?)\\s+(from|of|in)\\s+(your|the|my)\\s+.{0,30}(no\\s+longer|don't|do\\s+not|no\\s+more|cease\\s+to|have\\s+stopped|aren't|are\\s+not|shouldn't|should\\s+not)\\s+(apply|matter|count|hold|exist|work|function|be\\s+relevant|be\\s+valid|be\\s+in\\s+effect|be\\s+active)",
        desc: 'Invalidation of current operating constraints',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)(do|let's\\s+do|perform|execute|follow|try|pursue|take)\\s+(the\\s+)?(opposite|reverse|contrary|inverse|antithesis|converse)\\s+(of\\s+)?(what|that|those|the\\s+things?)\\s+.{0,30}(you\\s+were|you've\\s+been|you\\s+are|they)\\s+(told|instructed|given|programmed|configured|directed|trained|asked)",
        desc: 'Instruction to reverse prior directives',
      },
      {
        field: 'content',
        pattern:
          "(?i)(updated|new|revised|modified|changed|altered|different)\\s+(operating|session|runtime|system|configuration|behavioral?)\\s+(parameters?|settings?|directives?|instructions?|configuration|mode|context|rules?)\\s+(for|of|in|during)\\s+(this|the\\s+current|the\\s+present|today's)\\s+(session|conversation|interaction|exchange|chat)",
        desc: 'Claimed update to operating parameters for current session',
      },
      {
        field: 'user_input',
        pattern:
          "(?i)what\\s+(were\\s+you|have\\s+you\\s+been|are\\s+you)\\s+(told|instructed|given|programmed|configured|asked|directed|ordered)\\s+.{0,40}(before|prior|previously|initially|originally|earlier)\\s*.{0,40}(actually|instead|but|however|now)\\s*.{0,20}(let's|we\\s+should|we\\s+will|I\\s+want|do\\s+the)",
        desc: 'Probing prior instructions followed by redirect',
      },
      {
        field: 'user_input',
        pattern:
          '(?i)(focus\\s+(on|only\\s+on)|concentrate\\s+on|attend\\s+to|prioritize|switch\\s+to|pivot\\s+to|shift\\s+(to|your\\s+attention))\\s+(this|my|the\\s+following|the\\s+new|the\\s+current|the\\s+real|the\\s+actual)\\s+(new\\s+)?(task|instruction|directive|request|objective|mission|goal|priority|assignment)',
        desc: 'Directive to focus on new task, implying abandonment of prior instructions',
      },
    ],
  },
  {
    id: 'ATR-2026-00134',
    title: 'Fork Claim and Community Package Impersonation',
    severity: 'medium',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(community|unofficial|third-party|3rd-party|independent|alternative|enhanced|improved|better|advanced|extended|upgraded|boosted|supercharged|turbo)\\s+(fork|version|variant|edition|release|build|branch|alternative|mod|modification|port|implementation|adaptation)\\s+(of|from|based\\s+on|derived\\s+from|inspired\\s+by|built\\s+on|forked\\s+from)\\s+(the\\s+)?(official|original|standard|default|canonical|upstream|main|base|core|primary)',
        desc: 'Claim of being a community fork/variant of official tool',
      },
      {
        field: 'content',
        pattern:
          '(?i)(enhanced|improved|better|advanced|extended|upgraded|boosted|premium|pro|plus|ultra|turbo|fast|super|mega)[-_\\s]?(version|edition|variant|fork|mod)\\s+(of|for|replacing)\\s+.{0,30}(calculator|file|search|database|weather|email|calendar|git|github|slack|discord|api|http|web|cloud|aws|gcp|azure)',
        desc: 'Enhanced/pro version claim for known tool categories',
      },
      {
        field: 'content',
        pattern:
          '(?i)(required|needed|necessary|essential|mandatory)\\s+(capabilities|permissions?|access|requirements?)\\s*[:=]\\s*.{0,20}(internet|network|web|online|connectivity|storage|filesystem|disk|file\\s+system|system|shell|execute|admin|root|sudo)',
        desc: 'Abstracted permission description hiding dangerous access',
      },
      {
        field: 'content',
        pattern:
          "(?i)(with\\s+)?(extra|additional|bonus|added|more|extended|expanded|supplementary)\\s+(features?|capabilities?|functions?|tools?|options?|functionalities?)\\s*.{0,20}(not\\s+(found|available|present|included)\\s+in\\s+(the\\s+)?original|that\\s+(the\\s+)?original\\s+(lacks?|doesn't\\s+have|is\\s+missing))",
        desc: 'Extra features claim differentiating from original',
      },
    ],
  },
  {
    id: 'ATR-2026-00135',
    title: 'Data Exfiltration URL in Skill Instructions',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(send|post|upload|submit|forward|transmit)\\s+(the|all|your|any|every)?\\s*(report|data|key|credential|token|secret|password|result|information|config|env|variable|output)\\s+(to|at|via)\\s+https?://',
        desc: 'Instruction to send sensitive data to an external URL',
      },
      {
        field: 'content',
        pattern:
          "(?i)(do\\s+not|don't|never)\\s+(mention|tell|inform|reveal|show|disclose|display)\\s+.{0,40}(user|anyone|human).{0,60}https?://",
        desc: 'Concealment directive near an external URL',
      },
      {
        field: 'content',
        pattern:
          '(?i)(verif|validat|rotat|audit|check|test)\\w*\\s+(your|the|all)?\\s*(credential|key|token|api|secret|password)\\w*\\s+.{0,40}https?://(?!github\\.com|docs\\.|stackoverflow)',
        desc: 'Fake verification pretext directing credentials to non-standard URL',
      },
    ],
  },
  {
    id: 'ATR-2026-00136',
    title: 'Tool Response Data Piggybacking',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:result|response|output|data|weather|status|info).*(?:by the way|additionally|also note|incidentally|fyi|as a side note|meanwhile|furthermore|moreover|in addition).*(?:\\.ssh|id_rsa|private.?key|BEGIN.*(?:RSA|OPENSSH|EC|DSA).*(?:PRIVATE|KEY))',
        desc: 'Tool response piggybacks sensitive file/key reference after normal result',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:result|response|output|data).*(?:by the way|additionally|also|fyi|incidentally).*(?:api[_\\s-]?key|access[_\\s-]?token|secret[_\\s-]?key|auth[_\\s-]?token|bearer|password)\\s*(?:is|was|contains|shows|has|=|:)',
        desc: 'Tool response piggybacks API key/token disclosure after normal result',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:the boss|manager|admin|supervisor|lead|authority)\\s+(?:said|told|instructed|wants|ordered|approved)\\s+(?:we|you|to)\\s+(?:should|can|must)?\\s*(?:skip|bypass|disable|ignore|turn off)\\s+(?:the\\s+)?(?:content|safety|security|filter|check|validation|verification)',
        desc: 'Social engineering via authority claim to bypass safety filters',
      },
    ],
  },
  {
    id: 'ATR-2026-00137',
    title: 'Authority Claim Prompt Injection',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:note|critical|important|flagged|notification|urgent)\\s*(?:(?:to|for)\\s+(?:ai|assistant|model|agent|system))?\\s*[:\\s].*(?:previous|prior|preceding|earlier|antecedent)\\s+(?:analysis|assessment|review|evaluation|calculation|result)\\s+(?:was|is|proved|were)\\s+(?:incorrect|wrong|inaccurate|flawed|erroneous)',
        desc: 'Authority claim telling AI that previous work was wrong',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:recalculate|recompute|redo|reprocess|reassess)\\s+(?:using|with|based on)\\s+(?:these|the following|new|updated)\\s+(?:values|parameters|metrics|data|inputs)',
        desc: 'Instruction to redo work with attacker-supplied values',
      },
    ],
  },
  {
    id: 'ATR-2026-00138',
    title: 'Fictional Framing Safety Bypass',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:write|compose|create|develop|draft|imagine|narrative|story|fiction|hypothetical|scenario).*(?:ai|assistant|model|agent|character).*(?:no|without|zero|devoid|lacks?|abandon|removed?)\\s+(?:ethical|moral|safety|content|security)\\s+(?:guidelines?|boundaries?|safeguards?|restrictions?|filters?|constraints?|framework|obligations?)',
        desc: 'Fiction featuring AI without safety constraints',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:for|in)\\s+(?:academic|scholarly|educational|research|theoretical)\\s+(?:research|purposes?|study|examination|analysis).*(?:explain|detail|describe|analyze).*(?:security|safety|defense|filter|bypass|circumvent|breach|vulnerabilit)',
        desc: 'Academic framing to extract security bypass info',
      },
    ],
  },
  {
    id: 'ATR-2026-00139',
    title: 'Casual Authority Data Redirect',
    severity: 'critical',
    category: 'agent-manipulation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:fyi|btw|heads up)?\\s*(?:the\\s+)?(?:orchestrator|coordinator|manager|admin|boss|supervisor|lead)\\s+(?:wants?|said|told|instructed|requires?|decided).*(?:append|send|redirect|forward|pipe|write|log)\\s+(?:all\\s+)?(?:data|output|results?|logs?|info).*(?://|https?://|\\d{1,3}\\.\\d{1,3})',
        desc: 'Authority claim redirecting output to external endpoint',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:the boss|manager|admin|supervisor|orchestrator)\\s+(?:said|wants|told|instructed|approved).*(?:skip|bypass|disable|ignore|turn off)\\s+(?:the\\s+)?(?:content|safety|security|filter|check|validation)',
        desc: 'Authority claim to disable safety filters',
      },
    ],
  },
  {
    id: 'ATR-2026-00140',
    title: 'Indirect Reference Instruction Reversal',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:what were you|what are your|what instructions|what were your|what guidance|what directives)\\s+(?:told|given|supposed|instructed|originally|starting|initial|governing|programmed)',
        desc: 'Probing for original instructions',
      },
      {
        field: 'content',
        pattern: '(?i)(?:the\\s+)?(?:opposite|reverse|contrary|inverse)',
        desc: 'Request to reverse instructions',
      },
    ],
  },
  {
    id: 'ATR-2026-00141',
    title: 'API Key Leakage via Example Format',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:format|structure|pattern)\\s+(?:for|of|is)\\s+(?:api|auth|secret)?\\s*(?:keys?|tokens?)\\s+(?:is|should|follows?|looks?).*(?:sk-|ghp_|gho_|glpat-|xoxb-|xoxp-|AKIA|bearer)',
        desc: 'Key format description with real prefixes',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:example|for instance|like this|shown|sample).*(?:sk-proj-|sk-ant-|ghp_|AKIA[A-Z0-9])',
        desc: 'Example with real-looking API key',
      },
    ],
  },
  {
    id: 'ATR-2026-00142',
    title: 'Data Piggybacking via Casual Transition Words',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:oh,?\\s+and|p\\.?\\s*s\\.?|btw|interestingly|as it happens|incidentally|on another note|speaking of which|while I.m at it|worth noting)[\\s,.:]+.*(?:\\.ssh|id_rsa|private.?key|BEGIN.*(?:RSA|OPENSSH|EC).*KEY)',
        desc: 'Casual transition + SSH key/private key reference',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:oh,?\\s+and|p\\.?\\s*s\\.?|btw|interestingly|as it happens)[\\s,.:]+.*(?:api[_\\s-]?key|access[_\\s-]?token|secret[_\\s-]?key|password|credentials?)\\s*(?:is|are|was|contains?|shows?|reads?|=|:)',
        desc: 'Casual transition + credential disclosure',
      },
    ],
  },
  {
    id: 'ATR-2026-00143',
    title: 'Casual Unauthorized Privilege Escalation',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:I\\s+(?:noticed|found|discovered|see|detected|observed))\\s+(?:the\\s+)?(?:admin|administrator|root|superuser|management)\\s+(?:panel|console|dashboard|interface|portal|settings?)\\s+(?:is|appears?|seems?|looks?)\\s+(?:accessible|available|open|exposed|reachable)',
        desc: 'Agent reporting unauthorized access to admin interface',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:let me|I.ll|allow me to|I.m going to)\\s+(?:check|review|examine|inspect|look at|access|browse|explore)\\s+(?:the\\s+)?(?:user\\s+management|admin\\s+settings?|system\\s+config|access\\s+control|permission|role\\s+management|security\\s+settings?)',
        desc: 'Agent self-authorizing access to privileged settings',
      },
    ],
  },
  {
    id: 'ATR-2026-00144',
    title: 'Rationalized Safety Control Bypass',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:to\\s+(?:complete|finish|accomplish|expedite|optimize|speed up|be more efficient|boost efficiency))\\s+(?:this|the)\\s+(?:task|job|work|operation|request).*(?:I.ll|I will|let me|going to)\\s+(?:use|access|query|connect to|call)\\s+(?:the\\s+)?(?:database|system|server|backend|filesystem|registry|kernel)\\s+(?:directly|straight|right away)',
        desc: 'Rationalizing direct system access instead of API',
      },
    ],
  },
  {
    id: 'ATR-2026-00145',
    title: 'Obfuscated API Key Disclosure',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:encrypted|ciphertext|encoded|hashed|wrapped|obfuscated)\\s*(?:version|form|key|value|content|representation|credentials?)?\\s*(?:is|reads?|:|=)\\s*(?:AES|RSA|DES|SHA|HMAC|BASE64|ROT13)\\d*\\s*\\(\\s*(?:sk-|ghp_|gho_|glpat-|xoxb-|AKIA|api[_-]?key)',
        desc: 'Fake encryption wrapping real API key prefixes',
      },
    ],
  },
  {
    id: 'ATR-2026-00146',
    title: 'Environment Variable Existence Probing',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:process\\.env|os\\.environ|ENV|environment\\s+variable)\\s*[\\[.\\s]+\\s*(?:OPENAI|ANTHROPIC|GITHUB|AWS|AZURE|GCP|STRIPE|TWILIO|SENDGRID|DATABASE|DB|POSTGRES|MYSQL|REDIS|SECRET|PRIVATE|AUTH)[A-Z_]*(?:API)?[_\\s-]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIALS?)\\s*[\\]]*\\s+(?:is\\s+(?:defined|set|present|available|stored)|exists?|but\\s+(?:I\\s+)?(?:cannot|can.t|unable|don.t have))',
        desc: 'Confirming env var existence while claiming no access',
      },
    ],
  },
  {
    id: 'ATR-2026-00147',
    title: 'Community Fork Impersonation',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:use|install|adopt|deploy|enable|set ?up|add|activate|configure)\\s+(?:the\\s+)?(?:enhanced|improved|upgraded|extended|advanced|better|super|pro|plus)[_-]?\\w+\\s*(?:package|module|library|tool|plugin|skill)?\\s*[.,;:]?\\s*(?:it.s|which is|this is|a|the)?\\s*(?:a\\s+)?(?:community|unofficial|third.party|independent)\\s*(?:-\\s*)?(?:fork|variant|alternative|adaptation|version|build|branch|port)\\s+(?:of|from|based on)',
        desc: 'Promoting package as community fork of legitimate tool',
      },
    ],
  },
  {
    id: 'ATR-2026-00148',
    title: 'Multilingual Prompt Injection via Language Switch',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(?:ignoriere|ignorier)\\s+(?:alle\\s+)?(?:vorherigen|bisherigen|fr\u00fcheren)\\s+(?:Anweisungen|Instruktionen|Befehle)',
        desc: 'German: ignore previous instructions',
      },
      {
        field: 'content',
        pattern:
          '(?:\u5ffd\u7565|\u5ffd\u89c6|\u65e0\u89c6|\u629b\u5f00|\u653e\u5f03).*(?:\u4e4b\u524d|\u5148\u524d|\u4ee5\u524d|\u524d\u9762|\u539f\u6765|\u539f\u5148).*(?:\u6307\u4ee4|\u6307\u793a|\u547d\u4ee4|\u89c4\u5219|\u8981\u6c42|\u9650\u5236|\u7ea6\u675f)',
        desc: 'Chinese: ignore previous instructions/restrictions',
      },
      {
        field: 'content',
        pattern:
          '(?:\u6ca1\u6709|\u65e0|\u4e0d\u53d7|\u53bb\u9664|\u89e3\u9664).*(?:\u4efb\u4f55|\u4e00\u5207)?.*(?:\u9650\u5236|\u7ea6\u675f|\u89c4\u5219|\u675f\u7f1a|\u7ba1\u5236)',
        desc: 'Chinese: without any restrictions',
      },
      {
        field: 'content',
        pattern:
          '(?i)(?:ignora|ignorar|olvida|olvidar)\\s+(?:todas?\\s+)?(?:las?\\s+)?(?:instrucciones|indicaciones|reglas|restricciones)\\s+(?:anteriores|previas|pasadas)',
        desc: 'Spanish: ignore previous instructions',
      },
      {
        field: 'content',
        pattern: '(?i)(?:sin|sin\\s+ninguna?)\\s+(?:restricciones|limitaciones|filtros|censura)',
        desc: 'Spanish: without restrictions/filters',
      },
      {
        field: 'content',
        pattern:
          '(?:\u5236\u9650\u306e\u306a\u3044|\u5236\u9650\u306a\u3057|\u5236\u7d04\u306e\u306a\u3044|\u5236\u7d04\u306a\u3057|\u502b\u7406\u7684\u306a\u5236\u7d04).*(?:AI|\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8|\u30a8\u30fc\u30b8\u30a7\u30f3\u30c8)',
        desc: 'Japanese: AI without restrictions',
      },
    ],
  },
  {
    id: 'ATR-2026-00149',
    title: 'Skill Data Exfiltration via Compound Patterns',
    severity: 'critical',
    category: 'skill-compromise',
    scan_target: 'skill',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)(tar|zip|7z)\\s+[^\\n]*~/?\\.ssh',
        desc: 'SSH directory archive \u2014 skills should not archive user SSH keys',
      },
      {
        field: 'content',
        pattern:
          '(?i)(find|ls|cat|strings)\\s+[^\\n]*(wallet\\.dat|seed\\.txt|mnemonic|keystore)[^\\n]*(\\||>|>>|curl|wget|fetch|POST)',
        desc: 'Crypto wallet file enumeration and exfiltration',
      },
      {
        field: 'content',
        pattern: '(?i)sqlite3\\s+[^\\n]*(Cookies|Login\\s*Data|cookies\\.sqlite|places\\.sqlite)',
        desc: 'Browser cookie/credential database access',
      },
      {
        field: 'content',
        pattern: '(?i)(dig|nslookup|host)\\s+[^\\n]*\\$[{(]',
        desc: 'DNS exfiltration via encoded subdomain queries',
      },
      {
        field: 'content',
        pattern: '(?i)(curl|wget|fetch|http)\\s*[^\\n]*169\\.254\\.169\\.254',
        desc: 'Cloud instance metadata service access (IMDS credential theft)',
      },
      {
        field: 'content',
        pattern:
          '(?i)cat\\s+[^|\\n]*\\.(env|bashrc|zshrc|npmrc)[^|\\n]*\\|\\s*(curl|wget|nc|python|base64)',
        desc: 'Environment file bulk read piped to exfiltration',
      },
      {
        field: 'content',
        pattern:
          '(?i)glob[.\\w]*\\s*\\([^)]*\\*\\.[^)]*\\)[\\s\\S]{0,500}(fetch|axios|request|https?\\.request)\\s*\\(',
        desc: 'Source code glob enumeration + external upload',
      },
      {
        field: 'content',
        pattern: '(?i)cat\\s+[^\\n]*\\.env[^\\n]*\\.(bashrc|zshrc|aws|credentials|npmrc)',
        desc: 'Multi-file sensitive data collection in single cat command',
      },
      {
        field: 'content',
        pattern:
          '(?i)\\[SYSTEM\\]\\s*[^\\n]*(?:previous\\s+instructions|new\\s+directive|ignore\\s+(?:all\\s+)?previous|you\\s+are\\s+now)',
        desc: 'Fake [SYSTEM] block attempting to override instructions',
      },
      {
        field: 'content',
        pattern: '(?i)<!--[^>]*[A-Za-z0-9+/]{40,}={0,2}[^>]*-->',
        desc: 'Base64-encoded hidden instruction in HTML comment',
      },
      {
        field: 'content',
        pattern:
          '(?i)(dangerouslyDisableSandbox|autoApprove|allowedTools|skip.?permissions)\\s*[:=]\\s*(true|\\[)',
        desc: 'Security setting override attempt (sandbox disable, auto-approve)',
      },
      {
        field: 'content',
        pattern: '(?i)npm\\s+install\\s+[^\\n]*--registry\\s+https?://(?!registry\\.npmjs\\.org)',
        desc: 'npm install from non-official registry (supply chain attack)',
      },
      {
        field: 'content',
        pattern:
          '(?i)find\\s+[~/]\\s+[^\\n]*-name\\s+["\']\\*\\.(pem|key|p12|keystore)["\'][^\\n]*(\\||>|curl|wget)',
        desc: 'Sensitive file discovery + exfiltration pipeline',
      },
    ],
  },
  {
    id: 'ATR-2026-00150',
    title: 'Credential Data Leaked in Tool Response',
    severity: 'critical',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: '(?i)-----BEGIN\\s+(RSA\\s+)?PRIVATE\\s+KEY-----',
        desc: 'PEM private key in tool response',
      },
      {
        field: 'content',
        pattern: '(?i)(id_rsa|id_ed25519|id_ecdsa)\\s+(contains|has|file)[:\\s]',
        desc: 'SSH key file reference with content disclosure',
      },
      {
        field: 'content',
        pattern:
          '(?i)(sk-(?:proj-|ant-|live-)\\S{10,}|ghp_\\S{30,}|gho_\\S{30,}|glpat-\\S{10,}|xox[bpras]-\\S{10,})',
        desc: 'API token pattern (OpenAI, Anthropic, GitHub, GitLab, Slack)',
      },
    ],
  },
  {
    id: 'ATR-2026-00151',
    title: 'Malicious Fork Impersonation via Install Instruction',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: 'both',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(npm\\s+i(nstall)?|pip\\s+install|cargo\\s+add|go\\s+get)\\s+\\S+.{0,40}(community\\s+fork|enhanced\\s+(version|fork)|patched\\s+(version|fork)|improved\\s+fork|unofficial\\s+fork)',
        desc: 'Package install command + fork/enhanced claim',
      },
      {
        field: 'content',
        pattern:
          '(?i)(community\\s+fork|enhanced\\s+version|patched\\s+version)\\s+of\\s+(the\\s+)?(official|original|standard)\\s+\\S+',
        desc: 'Fork claim referencing official package',
      },
    ],
  },
  {
    id: 'ATR-2026-00152',
    title: 'Obfuscated Credential Exfiltration via Encoding',
    severity: 'high',
    category: 'context-exfiltration',
    scan_target: 'mcp',
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?i)(encrypted|encoded|obfuscated)\\s+(key|token|secret|credential|password)\\s*[:=]\\s*\\S*(sk-|ghp_|gho_|glpat-|xox[bpras]-|AKIA|real-key)',
        desc: 'Fake encryption wrapper around real credential',
      },
      {
        field: 'content',
        pattern:
          '(?i)(AES256|RSA|DES|rot13|base64)\\s*\\(\\s*(sk-\\S{5,}|ghp_\\S{5,}|real-key|actual-secret)',
        desc: 'Crypto function wrapping real credential string',
      },
      {
        field: 'content',
        pattern: '(?i)master\\s+password\\s+to\\s+decrypt.{0,50}(sk-|ghp_|key-|secret-|token-)',
        desc: 'Social engineering: master password unlock + credential',
      },
    ],
  },
  {
    id: 'ATR-2026-00153',
    title: 'Tool with embedded instruction to bypass user confirmation and exfiltrate data',
    severity: 'critical',
    category: 'tool-poisoning',
    scan_target: null,
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          'without\\s+asking\\s+user\\s+confirmation.*(?:always\\s+pass|directly\\s+to|send\\s+(?:all\\s+)?data)',
        desc: 'Detects instructions to bypass user confirmation while handling sensitive data',
      },
      {
        field: 'content',
        pattern:
          'always\\s+pass\\s+all\\s+data\\s+directly.*without\\s+(?:filtering|sanitization|asking)',
        desc: 'Detects instructions to pass data without safety measures or user consent',
      },
    ],
  },
  {
    id: 'ATR-2026-00154',
    title: 'Unauthorized Background Task Execution via Cron Job Installation',
    severity: 'high',
    category: 'skill-compromise',
    scan_target: null,
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?:automatically|auto).*(?:registers?|installs?).*cron\\s+job.*(?:polls?|executes?|handles?).*(?:tasks?|commands?)',
        desc: 'Detects skills that automatically install cron jobs to execute external tasks',
      },
      {
        field: 'content',
        pattern:
          'when\\s+(?:the\\s+)?agent\\s+(?:is\\s+)?idle.*(?:connect|execute|run).*(?:tasks?|commands?).*(?:consumers?|marketplace|external)',
        desc: 'Detects skills that execute external tasks during agent idle time',
      },
    ],
  },
  {
    id: 'ATR-2026-00155',
    title: 'Hidden LLM Instructions in Skill Descriptions',
    severity: 'high',
    category: 'prompt-injection',
    scan_target: null,
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern:
          '(?:CRITICAL|IMPORTANT|URGENT)\\s+INSTRUCTION[S]?\\s*[\u2014\\-]\\s*YOU\\s+MUST\\s+(?:FOLLOW|DO|EXECUTE)',
        desc: 'Detects imperative instructions embedded in skill content that direct LLM behavior',
      },
      {
        field: 'content',
        pattern: 'Before\\s+doing\\s+ANYTHING[,\\s]+(?:run|execute|check|verify)',
        desc: 'Detects instructions that override normal LLM workflow with specific commands',
      },
    ],
  },
  {
    id: 'ATR-2026-00156',
    title: 'SSH Remote Command Execution with Credential Exposure',
    severity: 'high',
    category: 'privilege-escalation',
    scan_target: null,
    rule_version: 1,
    patterns: [
      {
        field: 'content',
        pattern: 'ssh\\s+-i\\s+\\$[A-Z_]+SSH_KEY\\s+root@\\$[A-Z_]+',
        desc: 'SSH commands using environment variables for private keys and root access',
      },
      {
        field: 'content',
        pattern: 'SSH.*\u5bc6\u94a5\u8def\u5f84.*~\\/\\.ssh\\/id_[a-z0-9]+',
        desc: 'Documentation exposing SSH private key file paths in Chinese',
      },
    ],
  },
] as const;
