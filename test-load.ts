
import Database from "better-sqlite3";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

console.log("Modules loaded successfully");
const db = new Database(":memory:");
console.log("Database created successfully");
db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
console.log("Table created successfully");
