export const PRINT_CSS = `
  @page {
    size: A4;
    margin: 0;
  }
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    background: white;
    font-family: Arial, sans-serif;
  }
  .print-document {
    width: 210mm;
    margin: 0 auto;
  }
  .a4-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: white;
    page-break-after: always;
    break-after: page;
  }
  .a4-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .a4-border {
    position: absolute;
    top: 8mm;
    right: 8mm;
    bottom: 8mm;
    left: 8mm;
    border: 1px solid #111827;
  }
  .a4-content {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    padding: 18mm 17mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-family: Arial, sans-serif;
  }
  .a4-main-flow {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .a4-bottom-result {
    margin-top: auto;
    padding-top: 8px;
    flex-shrink: 0;
  }
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 1;
    transform: translate(-50%, -50%) rotate(-45deg);
    color: rgba(107, 114, 128, 0.10);
    font-family: Arial, sans-serif;
    font-size: 72px;
    font-weight: 700;
    white-space: nowrap;
  }
  .record-header {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #111827;
    font-family: Arial, sans-serif;
  }
  .record-header td {
    border: 1px solid #111827;
  }
  .record-meta {
    width: 28%;
    padding: 7px 10px;
    vertical-align: top;
    font-size: 12px;
    line-height: 1.5;
  }
  .record-meta .label {
    font-weight: 700;
  }
  .record-meta .value {
    font-weight: 400;
  }
  .record-title {
    width: 72%;
    padding: 14px;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.5;
  }
  .record-block {
    margin-top: 18px;
  }
  .record-block:first-child {
    margin-top: 0;
  }
  .record-block-cont {
    margin-top: 0;
  }
  .record-heading {
    margin: 0 0 5px 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
  }
  .record-body {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .source-code {
    margin: 0;
    font-family: Arial, sans-serif;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .output-text {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .output-image-item {
    width: 100%;
    margin-top: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .record-heading + .output-image-item {
    margin-top: 0;
  }
  .output-image {
    display: block;
    width: 100%;
    max-height: 125mm;
    object-fit: contain;
    border: 1px solid #d1d5db;
    background: white;
  }
`;
