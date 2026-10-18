import type { SectionKind } from "./sections";

/** What the prompt is about: the student's department and, for non-programming records, the sections to fill. */
export interface AiContext {
  /** Free-text department from Settings, e.g. "Mechanical Engineering". May be empty. */
  department: string;
  /** The record's own sections (custom layouts only); null = the original programming-lab layout. */
  layout: { id: string; title: string; kind: SectionKind }[] | null;
  /** Heading of the closing block in a custom layout. */
  resultTitle: string;
}

export interface LabRecordPromptInput {
  experimentTitle: string;
  programmingLanguage: string;
  problemRequirements: string;
  customInstructions: string;
  context?: AiContext;
}

export interface ParsedLabRecord {
  aim: string;
  algorithm: string;
  sourceCode: string;
  output: string;
  viva: string;
  result: string;
  /** Standard input the program reads, one value per line (empty when it reads none). Used when running the code. */
  input?: string;
  /** Custom layouts: text by section id, plus "result". */
  custom?: Record<string, string>;
}

/** Sections the model should write: blank hand-written space is never generated. */
const writable = (ctx: AiContext) => (ctx.layout ?? []).filter((s) => s.kind !== "lines");

const KIND_HINT: Record<SectionKind, string> = {
  text: "Plain paragraphs, or an ordered list (<ol><li>) where steps are natural.",
  code: "Preformatted text inside <pre>. Keep spacing and alignment; type tables as aligned rows separated by | .",
  output: "Plain text describing the readings or results. Images are added by the student later, so do not mention images.",
  lines: "",
};

function buildCustomPrompt(input: LabRecordPromptInput, ctx: AiContext): string {
  const dept = ctx.department.trim() || "the student's department";
  const title = input.experimentTitle || "{{EXPERIMENT_TITLE}}";
  const tools = input.programmingLanguage.trim();
  const req = input.problemRequirements || "{{PROBLEM_REQUIREMENTS}}";
  const custom = input.customInstructions || "{{CUSTOM_INSTRUCTIONS}}";
  const secs = writable(ctx);
  const result = { id: "result", title: ctx.resultTitle.trim() || "Result" };
  const upper = (t: string) => `${t.trim().toUpperCase()}:`;

  const list = [...secs.map((s) => s.title), result.title].map((t, i) => `${i + 1}. ${upper(t)}`).join("\n");
  const ids = [...secs.map((s) => s.id), result.id].map((id) => `- ${id}`).join("\n");
  const skeleton = [
    ...secs.map((s) =>
      s.kind === "code"
        ? `  <section data-section="${s.id}">\n    <h2>${upper(s.title)}</h2>\n    <pre>Content for ${s.title}.</pre>\n  </section>`
        : `  <section data-section="${s.id}">\n    <h2>${upper(s.title)}</h2>\n    <p>Content for ${s.title}.</p>\n  </section>`
    ),
    `  <section data-section="${result.id}">\n    <h2>${upper(result.title)}</h2>\n    <p>Content for ${result.title}.</p>\n  </section>`,
  ].join("\n\n");
  const hints = secs.map((s) => `- ${s.title}: ${KIND_HINT[s.kind]}`).join("\n");

  return `You are a college professor of ${dept} preparing a complete laboratory practical record for a student.

Write the record for the experiment below, in the style and vocabulary a ${dept} lab expects.

EXPERIMENT DETAILS
- Experiment Title: ${title}
- Department: ${dept}
- Apparatus / tools / software: ${tools || "choose what a standard lab would use"}
- What the experiment covers: ${req}
- Custom Instructions: ${custom}

The generated response will be parsed automatically by the application.

Return the whole record as ONE single HTML code block: one \`\`\`html fenced block that contains the complete HTML, so it can be copied in one click.
Do not split the answer into several code blocks.
Do not return JSON or XML.
Do not write anything before or after the code block, no explanations.

The record MUST contain exactly these sections and in this exact order:

${list}

Use these exact data-section values:
${ids}

HTML STRUCTURE:

<div class="lab-record">
${skeleton}
</div>

HOW TO WRITE EACH SECTION:
${hints}
- ${result.title}: A short conclusion statement tied to the experiment.

CONTENT RULES:
1. Use simple college-level language.
2. Generate content based only on the experiment details above.
3. Use realistic values, units and formulae for ${dept}; do not invent impossible readings.
4. Follow the custom instructions.
5. Do not introduce sections that are not listed.
6. Never change the data-section attribute values.
7. Properly escape HTML characters where necessary.
8. Every opening HTML tag must have a matching closing tag.
9. Return valid parseable HTML only.`;
}

export function buildLabRecordPrompt({
  experimentTitle,
  programmingLanguage,
  problemRequirements,
  customInstructions,
  context,
}: LabRecordPromptInput): string {
  if (context?.layout) {
    return buildCustomPrompt({ experimentTitle, programmingLanguage, problemRequirements, customInstructions, context }, context);
  }
  const dept = context?.department.trim() || "Computer Science";
  const title = experimentTitle || "{{EXPERIMENT_TITLE}}";
  const lang = programmingLanguage || "{{PROGRAMMING_LANGUAGE}}";
  const req = problemRequirements || "{{PROBLEM_REQUIREMENTS}}";
  const custom = customInstructions || "{{CUSTOM_INSTRUCTIONS}}";

  return `You are a college professor of ${dept} preparing a complete laboratory practical record for a ${dept} student.

Generate a laboratory record using the experiment details supplied at runtime.

EXPERIMENT DETAILS
- Experiment Title: ${title}
- Programming Language: ${lang}
- Problem / Requirements: ${req}
- Custom Instructions: ${custom}

The generated response will be parsed automatically by the application.

Return the whole record as ONE single HTML code block: one \`\`\`html fenced block that contains the complete HTML, so it can be copied in one click.
Do not split the answer into several code blocks.
Do not return JSON or XML.
Do not write anything before or after the code block, no explanations.

The record MUST contain exactly these sections and in this exact order:

1. AIM:
2. ALGORITHM:
3. SOURCE CODE:
4. OUTPUT:
5. Review Questions
6. RESULT:

Use these exact data-section values:
- aim
- algorithm
- source-code
- input
- output
- viva
- result

The "input" section is NOT one of the six printed sections. It carries the standard input the program reads, so the record can be run later. It goes right after source-code.

HTML STRUCTURE:

<div class="lab-record">
  <section data-section="aim">
    <h2>AIM:</h2>
    <p>Generate the aim here.</p>
  </section>

  <section data-section="algorithm">
    <h2>ALGORITHM:</h2>
    <ol>
      <li>Generate algorithm step.</li>
    </ol>
  </section>

  <section data-section="source-code">
    <h2>SOURCE CODE:</h2>
    <pre><code>Generate the complete executable source code here.</code></pre>
  </section>

  <section data-section="input">
    <h2>INPUT:</h2>
    <pre>Exactly what the program reads from standard input, one value per line, in the order it reads them. Leave this empty if the program reads no input.</pre>
  </section>

  <section data-section="output">
    <h2>OUTPUT:</h2>
    <pre>Generate output corresponding to the source code.</pre>
  </section>

  <section data-section="viva">
    <h2>Review Questions</h2>
    <div class="viva-question">
      <p class="question"><strong>1. </strong>Question</p>
      <p class="answer"><strong>Answer: </strong>Concise answer</p>
    </div>
  </section>

  <section data-section="result">
    <h2>RESULT:</h2>
    <p>Generate the result statement.</p>
  </section>
</div>

CONTENT RULES:
1. Use simple college-level language.
2. Generate content based only on the runtime experiment details.
3. Follow the requested programming language.
4. Follow the requested problem and requirements.
5. Follow the custom instructions.
6. The algorithm must accurately describe the generated source code.
7. The source code must be complete and executable.
8. The output must be exactly what the source code prints when run with the input above.
8a. If the program asks for values (input(), scanf, cin, Scanner), give realistic test values in the input section, one per line. If it reads nothing, leave the input section empty.
9. Generate exactly 5 viva questions by default.
10. Viva questions must be directly related to the current experiment.
11. Viva answers must be concise and easy to understand.
12. Do not introduce unnecessary sections.
13. Do not generate Requirements, Theory, Sample Input, Conclusion, or other sections.
14. Preserve source-code indentation.
15. Properly escape HTML characters where necessary.
16. Never change the data-section attribute values.
17. Every opening HTML tag must have a matching closing tag.
18. Return valid parseable HTML only.`;
}

export function cleanLLMHTML(rawHTML: string): string {
  if (!rawHTML) return "";
  let clean = rawHTML.trim();
  clean = clean
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return clean;
}

function extractTag(cleanHTML: string, tagNames: string[]): string {
  for (const tag of tagNames) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
    const match = regex.exec(cleanHTML);
    if (match && match[1] && match[1].trim()) {
      return match[1]
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
    }
  }
  return "";
}

/** DOMParser-based parser with regex-fallback (`extractTag`), matching the original app 1:1. */
export function parseLabRecordHTML(cleanHTML: string, ctx?: AiContext): ParsedLabRecord {
  if (!cleanHTML || !cleanHTML.trim()) {
    throw new Error("Invalid HTML content provided.");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHTML, "text/html");

  const getSectionText = (selector: string): string => {
    const sec = doc.querySelector(selector);
    if (!sec) return "";

    const listItems = sec.querySelectorAll("li");
    if (listItems.length > 0) {
      return Array.from(listItems)
        .map((li, idx) => {
          const text = (li.textContent || "").trim();
          if (/^step\s*\d+/i.test(text)) return text;
          return `Step ${idx + 1}: ${text}`;
        })
        .join("\n");
    }

    const clone = sec.cloneNode(true) as HTMLElement;
    const h2 = clone.querySelector("h2");
    if (h2) h2.remove();
    return (clone.textContent || "").trim();
  };

  /** Preformatted section: keeps whitespace exactly. */
  const getRawText = (id: string): string => {
    const sec = doc.querySelector(`[data-section="${id}"]`);
    if (!sec) return "";
    const pre = sec.querySelector("pre") || sec.querySelector("code");
    if (pre) return pre.textContent || "";
    const clone = sec.cloneNode(true) as HTMLElement;
    clone.querySelector("h2")?.remove();
    return (clone.textContent || "").trim();
  };

  const getCodeText = (): string => {
    const sec = doc.querySelector('[data-section="source-code"]');
    if (!sec) return "";
    const codeEl = sec.querySelector("code") || sec.querySelector("pre");
    if (codeEl) return codeEl.textContent || "";
    const clone = sec.cloneNode(true) as HTMLElement;
    const h2 = clone.querySelector("h2");
    if (h2) h2.remove();
    return clone.textContent || "";
  };

  const getVivaText = (): string => {
    const sec = doc.querySelector('[data-section="viva"]');
    if (!sec) return "";

    const vivaQuestions = sec.querySelectorAll(".viva-question");
    if (vivaQuestions.length > 0) {
      return Array.from(vivaQuestions)
        .map((qEl, idx) => {
          const qText = qEl.querySelector(".question")?.textContent || "";
          const aText = qEl.querySelector(".answer")?.textContent || "";

          const cleanQ = qText.replace(/^(\d+\.|Q\d+[:.]?)\s*/i, "").trim();
          const cleanA = aText.replace(/^(Answer:|A\d+[:.]?)\s*/i, "").trim();

          return `Q${idx + 1}: ${cleanQ}\nA${idx + 1}: ${cleanA}`;
        })
        .join("\n\n");
    }

    const clone = sec.cloneNode(true) as HTMLElement;
    const h2 = clone.querySelector("h2");
    if (h2) h2.remove();
    return (clone.textContent || "").trim();
  };

  if (ctx?.layout) {
    const custom: Record<string, string> = {};
    for (const sec of writable(ctx)) {
      custom[sec.id] = sec.kind === "code" ? getRawText(sec.id) : getSectionText(`[data-section="${sec.id}"]`);
    }
    custom.result = getSectionText('[data-section="result"]');
    return { aim: "", algorithm: "", sourceCode: "", output: "", viva: "", result: custom.result, custom };
  }

  return {
    aim: getSectionText('[data-section="aim"]') || extractTag(cleanHTML, ["aim"]),
    algorithm: getSectionText('[data-section="algorithm"]') || extractTag(cleanHTML, ["algorithm", "algo"]),
    sourceCode: getCodeText() || extractTag(cleanHTML, ["source-code", "sourcecode", "code"]),
    output: getSectionText('[data-section="output"]') || extractTag(cleanHTML, ["output"]),
    input: getRawText("input"),
    viva: getVivaText() || extractTag(cleanHTML, ["viva", "review", "review_questions"]),
    result: getSectionText('[data-section="result"]') || extractTag(cleanHTML, ["result"]),
  };
}

export function validateLabRecord(parsed: ParsedLabRecord, ctx?: AiContext): void {
  const missing: string[] = [];

  if (ctx?.layout && parsed.custom) {
    // Custom layout: every writable section and the closing block must have come back with text.
    for (const sec of writable(ctx)) if (!parsed.custom[sec.id]?.trim()) missing.push(sec.title.toUpperCase());
    if (!parsed.custom.result?.trim()) missing.push((ctx.resultTitle || "Result").toUpperCase());
    if (missing.length > 0) throw new Error(`Generated record is incomplete. Missing sections: ${missing.join(", ")}.`);
    return;
  }

  if (!parsed.aim || !parsed.aim.trim()) missing.push("AIM");
  if (!parsed.algorithm || !parsed.algorithm.trim()) missing.push("ALGORITHM");
  if (!parsed.sourceCode || !parsed.sourceCode.trim()) missing.push("SOURCE CODE");
  if (!parsed.output || !parsed.output.trim()) missing.push("OUTPUT");
  if (!parsed.viva || !parsed.viva.trim()) missing.push("Review Questions");
  if (!parsed.result || !parsed.result.trim()) missing.push("RESULT");

  if (missing.length > 0) {
    throw new Error(`Generated record is incomplete. Missing required sections: ${missing.join(", ")}.`);
  }
}

export function createNewGenerationId(): string {
  return "gen_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

export function buildSampleTaggedData(title: string, lang: string): string {
  const t = title || "BINARY SEARCH TREE OPERATIONAL RECORD";
  const l = lang || "Python";

  return `<div class="lab-record">
  <section data-section="aim">
    <h2>AIM:</h2>
    <p>To implement binary search tree operations including insertion, deletion, and in-order traversal in ${l} and verify its output.</p>
  </section>

  <section data-section="algorithm">
    <h2>ALGORITHM:</h2>
    <ol>
      <li>Start the program.</li>
      <li>Define a node structure containing key, left child pointer, and right child pointer.</li>
      <li>Implement insertion function to recursively insert key based on BST ordering properties.</li>
      <li>Implement in-order traversal function to traverse left subtree, print root, and traverse right subtree.</li>
      <li>Construct sample tree by inserting key sequence into the binary search tree.</li>
      <li>Display the resulting in-order traversal output and terminate the program.</li>
    </ol>
  </section>

  <section data-section="source-code">
    <h2>SOURCE CODE:</h2>
    <pre><code>class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

def insert(node, key):
    if node is None:
        return Node(key)
    if key < node.key:
        node.left = insert(node.left, key)
    else:
        node.right = insert(node.right, key)
    return node

def inorder(root):
    if root:
        inorder(root.left)
        print(root.key, end=" ")
        inorder(root.right)

if __name__ == "__main__":
    keys = [50, 30, 20, 40, 70, 60, 80]
    root = None
    for k in keys:
        root = insert(root, k)
    print("In-order Traversal of BST:")
    inorder(root)
    print()</code></pre>
  </section>

  <section data-section="input">
    <h2>INPUT:</h2>
    <pre></pre>
  </section>

  <section data-section="output">
    <h2>OUTPUT:</h2>
    <pre>In-order Traversal of BST:
20 30 40 50 60 70 80</pre>
  </section>

  <section data-section="viva">
    <h2>Review Questions</h2>
    <div class="viva-question">
      <p class="question"><strong>1. </strong>What is a Binary Search Tree (BST)?</p>
      <p class="answer"><strong>Answer: </strong>A binary tree where the left child key is smaller and the right child key is larger than the parent node.</p>
    </div>
    <div class="viva-question">
      <p class="question"><strong>2. </strong>What is the average time complexity of BST search?</p>
      <p class="answer"><strong>Answer: </strong>O(log N) for balanced trees.</p>
    </div>
    <div class="viva-question">
      <p class="question"><strong>3. </strong>Which traversal prints a BST in sorted ascending order?</p>
      <p class="answer"><strong>Answer: </strong>In-order traversal.</p>
    </div>
    <div class="viva-question">
      <p class="question"><strong>4. </strong>What is the worst-case time complexity of search in a skewed BST?</p>
      <p class="answer"><strong>Answer: </strong>O(N).</p>
    </div>
    <div class="viva-question">
      <p class="question"><strong>5. </strong>How can a skewed BST be balanced?</p>
      <p class="answer"><strong>Answer: </strong>By using self-balancing trees like AVL or Red-Black trees.</p>
    </div>
  </section>

  <section data-section="result">
    <h2>RESULT:</h2>
    <p>Thus, the ${l} program for ${t} was successfully executed and verified.</p>
  </section>
</div>`;
}
