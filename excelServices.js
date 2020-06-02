let excelFunction = {
    getWorkBook: function getWorkBook() {
        var xl = require('excel4node');
        let workbook = new xl.Workbook();
        return workbook;
    },

    addWorkSheet: function addWorkSheet(workbook, worksheetName) {
        var ws_integPriTestworkbook = workbook.addWorksheet(worksheetName);
        return ws_integPriTestworkbook; //Return workSheet
    },

    writeToWorkSheet: function writeToWorkSheet(worksheet, contentToWrite) {
        worksheet.cell(2, 1).string(contentToWrite);
        return worksheet;
    },

    writeWorkBookToExcel: function writeWorkBookToExcel(workBook, fileName) { //Write Workbook to File
        workBook.write(fileName + '.xlsx');
    }
}

module.exports=excelFunction;