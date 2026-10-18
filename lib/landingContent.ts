/** Landing-page copy shared with the structured data in app/page.tsx (the FAQ appears on the page and in FAQPage JSON-LD). */
export const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the best online lab record maker?",
    a: "Record Lab is a free online lab record maker for engineering and science students in any department. You choose the sections your lab needs, write or AI-draft the record, run the code to capture its real output, and download a print-ready fair copy as PDF or Word. It works in the browser with no install and no account.",
  },
  {
    q: "How do I make a lab record online?",
    a: "Open Record Lab, pick your department's layout, fill in the aim, program or procedure, output and result, check the live A4 preview, then export a PDF or Word file or print it. Python and JavaScript can be run in the browser so the output in your record is real.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Record Lab runs in your browser, there is nothing to install and no payment step. It is supported by small ads.",
  },
  {
    q: "Is it only for computer science?",
    a: "No. Pick your department's layout, or build your own: Aim, Apparatus, Theory, Procedure, Observations, Calculations, Result, whatever your lab asks for. Each subject remembers its layout.",
  },
  {
    q: "Which languages can it run?",
    a: "Python and JavaScript run on your own device, even offline once loaded, and Python graphs (matplotlib) come out as images. C, C++ and Java need a compiler, so they run on a runner service, and only after you agree to send the code.",
  },
  {
    q: "How do I know the output is real?",
    a: "Output captured from a run is marked Verified, with the language and time. If you edit the code afterwards it flags the output as out of date, so sample text and real output never get mixed up.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can write, run, preview and export without signing in. An account (email or Google) only adds cloud saving, subject folders, share links and sync across devices.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Install it from your browser or add it to your home screen and the editor, preview and exports keep working without a connection. Saving to the cloud, sharing and AI drafting need one.",
  },
  {
    q: "What can I export?",
    a: "A PDF (rendered snapshot or vector with selectable text), a Word .docx you can keep editing, or print directly. Saved records can be downloaded as a PDF straight from the Files screen.",
  },
  {
    q: "Will it match my college's record format?",
    a: "Choose the standard sheet or the college sheet, then adjust the heading table, page border, watermark, font and sections until it matches your department's format.",
  },
  {
    q: "Where is my data stored?",
    a: "Unsaved work stays in your browser. If you save to the cloud, records live in your own account. You can open them; Record Lab administrators can also read saved records to support users and keep the service healthy. A share link shows a copy only to people who have the link, until you revoke it.",
  },
];
