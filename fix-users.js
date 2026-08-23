const fs = require('fs');

const path = 'src/utils/storage.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/id: 'usr_1',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_1',$1createdAt: '2026-01-10',\n    role: 'PROVINCE_LEADER',");
code = code.replace(/id: 'usr_2',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_2',$1createdAt: '2026-01-10',\n    role: 'PROVINCE_LEADER',");
code = code.replace(/id: 'usr_3',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_3',$1createdAt: '2026-01-10',\n    role: 'PROVINCE_LEADER',");
code = code.replace(/id: 'usr_4',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_4',$1createdAt: '2026-01-10',\n    role: 'PROVINCE_LEADER',");

code = code.replace(/id: 'usr_5',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_5',$1createdAt: '2026-01-10',\n    role: 'DEPT_HEAD',");
code = code.replace(/id: 'usr_6',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_6',$1createdAt: '2026-01-10',\n    role: 'DEPT_HEAD',");
code = code.replace(/id: 'usr_7',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_7',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_8',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_8',$1createdAt: '2026-01-10',\n    role: 'DEPT_HEAD',");
code = code.replace(/id: 'usr_9',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_9',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_10',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_10',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_11',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_11',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_12',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_12',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_13',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_13',$1createdAt: '2026-01-10',\n    role: 'STAFF',");
code = code.replace(/id: 'usr_14',([^}]+)createdAt: '2026-01-10',/g, "id: 'usr_14',$1createdAt: '2026-01-10',\n    role: 'STAFF',");

fs.writeFileSync(path, code);
