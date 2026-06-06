/* ============================================================
   GST Tax Invoice Generator
   ============================================================ */

/* ---------- Number to Indian-words (Rupees & Paise) ---------- */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
  "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
  "Seventy", "Eighty", "Ninety"];

function twoDigit(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigit(n) {
  let str = "";
  if (n > 99) {
    str += ONES[Math.floor(n / 100)] + " Hundred";
    n %= 100;
    if (n) str += " ";
  }
  if (n) str += twoDigit(n);
  return str;
}

/* Indian numbering: crore, lakh, thousand, hundred */
function numToIndianWords(num) {
  num = Math.floor(num);
  if (num === 0) return "Zero";
  let words = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const rest = num;

  if (crore) words += threeDigit(crore) + " Crore ";
  if (lakh) words += twoDigit(lakh) + " Lakh ";
  if (thousand) words += twoDigit(thousand) + " Thousand ";
  if (rest) words += threeDigit(rest);
  return words.trim();
}

function rupeesInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let str = "INR " + numToIndianWords(rupees);
  if (paise > 0) {
    str += " and " + twoDigit(paise) + " paise";
  }
  return str + " Only";
}

function taxInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let str = "INR " + numToIndianWords(rupees);
  if (paise > 0) {
    str += " and " + twoDigit(paise) + " paise";
  }
  return str + " Only";
}

/* ---------- Formatting ---------- */
function fmt(n) {
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d}-${months[parseInt(m, 10) - 1]}-${y.slice(2)}`;
}

/* ---------- Line items ---------- */
let itemSeq = 0;
const itemsContainer = document.getElementById("itemsContainer");

function makeItem(data = {}) {
  itemSeq++;
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <button type="button" class="remove-item" title="Remove">&times;</button>
    <label>Particulars <input type="text" class="it-desc-in" value="${data.desc ?? "Sales Commission"}" /></label>
    <div class="row">
      <label>HSN/SAC <input type="text" class="it-hsn-in" value="${data.hsn ?? "996111"}" /></label>
      <label>Per <input type="text" class="it-per-in" value="${data.per ?? ""}" /></label>
    </div>
    <div class="row">
      <label>Quantity <input type="number" class="it-qty-in" step="any" value="${data.qty ?? ""}" /></label>
      <label>Rate <input type="number" class="it-rate-in" step="any" value="${data.rate ?? ""}" /></label>
    </div>
    <label>Amount (leave blank to auto-calc Qty×Rate)
      <input type="number" class="it-amt-in" step="any" value="${data.amount ?? "233237.89"}" />
    </label>
  `;
  card.querySelector(".remove-item").addEventListener("click", () => {
    card.remove();
    render();
  });
  card.querySelectorAll("input").forEach((el) =>
    el.addEventListener("input", render)
  );
  itemsContainer.appendChild(card);
}

function readItems() {
  return [...itemsContainer.querySelectorAll(".item-card")].map((card) => {
    const desc = card.querySelector(".it-desc-in").value;
    const hsn = card.querySelector(".it-hsn-in").value;
    const per = card.querySelector(".it-per-in").value;
    const qty = parseFloat(card.querySelector(".it-qty-in").value) || 0;
    const rate = parseFloat(card.querySelector(".it-rate-in").value) || 0;
    let amount = parseFloat(card.querySelector(".it-amt-in").value);
    if (isNaN(amount)) amount = qty * rate;
    // "Settlement Amount" lines are informational: shown on the invoice but
    // excluded from taxable value, tax, rounding and the grand total.
    // Matches whenever "Settlement Amount" appears anywhere in the Particulars
    // (e.g. "Settlement Amount", "Settlement Amount (Nov 2025)").
    const excluded = desc.toLowerCase().includes("settlement amount");
    return { desc, hsn, per, qty, rate, amount, excluded };
  });
}

/* ---------- Buyer same-as-shipping toggle ---------- */
const sameAsShip = document.getElementById("sameAsShip");
const buyerFields = document.getElementById("buyerFields");
function syncBuyerToggle() {
  buyerFields.classList.toggle("collapsed", sameAsShip.checked);
  render();
}
sameAsShip.addEventListener("change", syncBuyerToggle);

/* ---------- Render preview ---------- */
const $ = (id) => document.getElementById(id);

function val(id) { return $(id).value; }

function render() {
  // Seller
  $("pSellerName").textContent = val("sellerName");
  $("pSellerNameSign").textContent = val("sellerName");
  $("pSellerAddress").textContent = val("sellerAddress");
  $("pSellerGstin").textContent = "GSTIN/UIN: " + val("sellerGstin");
  $("pSellerState").textContent =
    "State Name : " + val("sellerState") + ", Code : " + val("sellerStateCode");
  $("pSellerEmail").textContent = "E-Mail : " + val("sellerEmail");
  $("pJurisdiction").textContent = (val("jurisdiction") || "").toUpperCase();

  // Invoice meta
  $("pInvoiceNo").textContent = val("invoiceNo");
  $("pInvoiceDate").textContent = fmtDate(val("invoiceDate"));

  // Consignee
  $("pShipName").textContent = val("shipName");
  $("pShipAddress").textContent = val("shipAddress");
  $("pShipGstin").textContent = val("shipGstin");
  $("pShipState").textContent =
    val("shipState") + ", Code : " + val("shipStateCode");

  // Buyer
  const useShip = sameAsShip.checked;
  $("pBuyerName").textContent = useShip ? val("shipName") : val("buyerName");
  $("pBuyerAddress").textContent = useShip ? val("shipAddress") : val("buyerAddress");
  $("pBuyerGstin").textContent = useShip ? val("shipGstin") : val("buyerGstin");
  $("pBuyerState").textContent = useShip
    ? val("shipState") + ", Code : " + val("shipStateCode")
    : val("buyerState") + ", Code : " + val("buyerStateCode");

  // Items + totals
  const items = readItems();
  const taxType = val("taxType");
  const gstRate = parseFloat(val("gstRate")) || 0;
  const taxable = items.reduce((s, it) => s + (it.excluded ? 0 : it.amount), 0);
  const taxTotal = taxable * gstRate / 100;

  // Build items body
  const body = $("pItemsBody");
  body.innerHTML = "";
  items.forEach((it, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="it-sl">${i + 1}</td>
      <td class="it-desc">${escapeHtml(it.desc)}</td>
      <td class="it-hsn">${escapeHtml(it.hsn)}</td>
      <td class="it-qty">${it.qty ? fmt(it.qty) : ""}</td>
      <td class="it-rate">${it.rate ? fmt(it.rate) : ""}</td>
      <td class="it-per">${escapeHtml(it.per)}</td>
      <td class="it-amt">${fmt(it.amount)}</td>`;
    body.appendChild(tr);
  });

  // Tax sub-lines (Output IGST or CGST+SGST) and rounding.
  // Each row keeps all 7 cells so vertical column dividers stay continuous;
  // the label sits right-aligned in the Particulars column, value in Amount.
  const half = taxTotal / 2;
  function subLine(label, value) {
    const tr = document.createElement("tr");
    tr.className = "sub-line";
    tr.innerHTML =
      `<td></td><td class="lbl">${label}</td><td></td><td></td><td></td><td></td><td class="val">${fmt(value)}</td>`;
    body.appendChild(tr);
  }
  if (taxType === "igst") {
    subLine("Output IGST", taxTotal);
  } else {
    subLine("Output CGST", half);
    subLine("Output SGST", half);
  }

  // Rounding
  let grand = taxable + taxTotal;
  let rounded = grand;
  let roundDiff = 0;
  if ($("roundOff").checked) {
    rounded = Math.round(grand);
    roundDiff = rounded - grand;
    subLine("Rounding Off", roundDiff);
  }

  // Spacer to push total down like the printed form
  const spacer = document.createElement("tr");
  spacer.className = "spacer-row";
  spacer.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
  body.appendChild(spacer);

  $("pGrandTotal").textContent = "₹ " + fmt(rounded);

  // Amount in words
  $("pAmountWords").textContent = rupeesInWords(rounded);

  // Tax summary table
  const taxHead = $("pTaxHeadGroup");
  const taxBody = $("pTaxBody");
  taxBody.innerHTML = "";
  // group by HSN (excluded "Settlement Amount" lines don't contribute to tax)
  const groups = {};
  items.forEach((it) => {
    if (it.excluded) return;
    groups[it.hsn] = (groups[it.hsn] || 0) + it.amount;
  });

  if (taxType === "igst") {
    taxHead.textContent = "IGST";
    taxHead.colSpan = 2;
    // ensure rate/amount header pair
    setTaxSubHeader(["Rate", "Amount"]);
    Object.entries(groups).forEach(([hsn, tv]) => {
      const tax = tv * gstRate / 100;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(hsn)}</td>
        <td>${fmt(tv)}</td>
        <td class="tx-rate-cell">${gstRate}%</td>
        <td>${fmt(tax)}</td>
        <td>${fmt(tax)}</td>`;
      taxBody.appendChild(tr);
    });
  } else {
    taxHead.textContent = "Central & State Tax";
    setTaxSubHeader(["Rate", "Amount"]);
    Object.entries(groups).forEach(([hsn, tv]) => {
      const tax = tv * gstRate / 100;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(hsn)}</td>
        <td>${fmt(tv)}</td>
        <td class="tx-rate-cell">${gstRate}%</td>
        <td>${fmt(tax)}</td>
        <td>${fmt(tax)}</td>`;
      taxBody.appendChild(tr);
    });
  }

  $("pTaxTotalTaxable").textContent = fmt(taxable);
  $("pTaxTotalAmount").textContent = fmt(taxTotal);
  $("pTaxTotalTax").textContent = fmt(taxTotal);

  // Tax amount in words
  $("pTaxWords").textContent = taxInWords(taxTotal);
}

function setTaxSubHeader(labels) {
  // The sub-header row is static in HTML (Rate / Amount); kept for clarity.
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------- Events ---------- */
document.getElementById("invoiceForm").addEventListener("input", render);
document.getElementById("addItemBtn").addEventListener("click", () => {
  makeItem({ desc: "", hsn: "996111", amount: "" });
  render();
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const el = document.getElementById("invoice");
  const invNo = (val("invoiceNo") || "invoice").replace(/[^\w.-]+/g, "_");
  // The invoice is 794px wide = exactly 210mm (A4 width) at 96dpi, so any PDF
  // margin would push the right edge off the page. Use margin 0 and rely on the
  // invoice's own internal padding for whitespace.
  const opt = {
    margin: 0,
    filename: `Invoice_${invNo}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css"] },
  };
  html2pdf().set(opt).from(el).save();
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

/* ---------- Init ---------- */
makeItem(); // one default item matching the sample invoice
syncBuyerToggle();
render();
