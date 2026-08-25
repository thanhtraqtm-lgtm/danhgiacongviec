import * as XLSX from 'xlsx';
const workbook = XLSX.readFile('Mau_Nhap_Lich_Tuan.xlsx');
console.log('Sheet names:', workbook.SheetNames);
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Sheet: ${sheetName} ===`);
  json.forEach((row, i) => console.log(i, row));
});