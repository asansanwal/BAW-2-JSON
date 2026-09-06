/* Engine test suite of baw-json.js - runs inside a BAW server script (the "Run Script" service of the BAW JSON Test app, or any script
   of an app that has the JsonChild / JsonAll business objects and the library in scope). Returns one line per check: "ok"/"FAIL". */
var R = [], PASS = 0, FAILS = 0;
function ok(label, cond, detail) { if (cond) { PASS++; R.push("ok   " + label); } else { FAILS++; R.push("FAIL " + label + (detail !== undefined ? " -> " + String(detail).substring(0, 300) : "")); } }
function eq(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), "got " + JSON.stringify(actual) + " expected " + JSON.stringify(expected)); }
function attempt(label, fn) { try { fn(); } catch (e) { FAILS++; R.push("FAIL " + label + " threw " + String(e).replace(/\n/g, " ").substring(0, 300)); } }
var UTC = Date.UTC(2025, 0, 15, 10, 30, 0, 123);

// ---------------------------------------------------------------- 1. BAW -> JSON, every type
attempt("toJS all types", function () {
    var a = new tw.object.JsonAll();
    a.str = "s \"q\" <x> & ü"; a.int = 42; a.dec = 1.25; a.bool = true; a.date = new Date(UTC); a.time = new Date(UTC);
    a.any = "text";
    a.child = new tw.object.JsonChild(); a.child.name = "c1"; a.child.qty = 3; a.child.price = 9.99; a.child.active = false; a.child.when = new Date(UTC);
    a.child.tags = new tw.object.listOf.String(); a.child.tags.insertIntoList(0, "t1"); a.child.tags.insertIntoList(1, "t2");
    a.children = new tw.object.listOf.JsonChild(); var c2 = new tw.object.JsonChild(); c2.name = "c2"; a.children.insertIntoList(0, c2); a.children.insertIntoList(1, a.child);
    a.strs = new tw.object.listOf.String(); a.strs.insertIntoList(0, "x"); a.strs.insertIntoList(1, "y");
    a.ints = new tw.object.listOf.Integer(); a.ints.insertIntoList(0, 1); a.ints.insertIntoList(1, 2);
    a.decs = new tw.object.listOf.Decimal(); a.decs.insertIntoList(0, 0.5);
    a.bools = new tw.object.listOf.Boolean(); a.bools.insertIntoList(0, true); a.bools.insertIntoList(1, false);
    a.dates = new tw.object.listOf.Date(); a.dates.insertIntoList(0, new Date(UTC));
    a.anys = new tw.object.listOf.ANY(); a.anys.insertIntoList(0, 5); a.anys.insertIntoList(1, "s"); a.anys.insertIntoList(2, c2);
    a.nvp = new tw.object.NameValuePair(); a.nvp.name = "n"; a.nvp.value = "v";
    a.nvps = new tw.object.listOf.NameValuePair(); a.nvps.insertIntoList(0, a.nvp);
    a.map = new tw.object.Map(); a.map.put("k1", "v1"); a.map.put("k2", 2); a.map.put("k3", c2);
    a.xml = "<a x=\"1\"><b>1</b></a>"; a.xmlDoc = "<r><s/></r>";
    a.record = new tw.object.Record(); a.record.col1 = "v"; a.record.col2 = 3;
    a.self = new tw.object.JsonAll(); a.self.str = "inner"; a.self.self = new tw.object.JsonAll(); a.self.self.str = "inner2";
    a.selves = new tw.object.listOf.JsonAll(); a.selves.insertIntoList(0, a.self);
    var j = BAWJSON.toJS(a);
    eq("str", j.str, "s \"q\" <x> & ü"); eq("int", j.int, 42); eq("dec", j.dec, 1.25); eq("bool", j.bool, true);
    eq("date iso", j.date, "2025-01-15T10:30:00.123Z"); eq("time iso", j.time, "2025-01-15T10:30:00.123Z"); eq("any", j.any, "text");
    eq("child", j.child, { name: "c1", qty: 3, price: 9.99, active: false, when: "2025-01-15T10:30:00.123Z", tags: ["t1", "t2"] });
    eq("children", j.children.length, 2); eq("children[0]", j.children[0], { name: "c2" }); eq("children[1].name", j.children[1].name, "c1");
    eq("strs", j.strs, ["x", "y"]); eq("ints", j.ints, [1, 2]); eq("decs", j.decs, [0.5]); eq("bools", j.bools, [true, false]); eq("dates", j.dates, ["2025-01-15T10:30:00.123Z"]);
    eq("anys", j.anys, [5, "s", { name: "c2" }]);
    eq("nvp", j.nvp, { name: "n", value: "v" }); eq("nvps", j.nvps, [{ name: "n", value: "v" }]);
    eq("map", j.map, { k1: "v1", k2: 2, k3: { name: "c2" } });
    ok("xml text", /^<a x="1">\s*<b>1<\/b>\s*<\/a>$/.test(j.xml), j.xml); ok("xmlDoc text", /<r>\s*<s\s*\/>\s*<\/r>/.test(j.xmlDoc), j.xmlDoc);
    eq("record", j.record, { col1: "v", col2: 3 }); eq("self", j.self, { str: "inner", self: { str: "inner2" } }); eq("selves", j.selves, [{ str: "inner", self: { str: "inner2" } }]);
    ok("toJSON parses back", JSON.parse(BAWJSON.toJSON(a)).child.name === "c1");
    ok("pretty", BAWJSON.toJSON(a.child, { indent: 2 }).indexOf("\n  \"name\"") > 0);
    // options
    var j2 = BAWJSON.toJS(a, { dateFormat: "epoch", xml: "object", typeProperty: "$type", omit: ["self.**", "children[].tags", "map.k3"], keyMapper: function (n) { return n === "str" ? "text" : n; } });
    eq("epoch", j2.date, UTC); eq("xml object", j2.xml, { name: "a", attributes: { x: "1" }, children: [{ name: "b", text: "1" }] });
    eq("$type", j2.$type, "JsonAll"); eq("$type child", j2.child.$type, "JsonChild"); eq("$type map", j2.map.$type, "Map"); eq("$type record", j2.record.$type, "Record");
    eq("omit self.**", j2.self, { $type: "JsonAll" }); ok("omit list field", j2.children[1].tags === undefined); ok("omit map key", j2.map.k3 === undefined);
    eq("keyMapper", j2.text, a.str); ok("keyMapper removed old", j2.str === undefined);
    var j3 = BAWJSON.toJS(a, { pick: ["str", "child.name", "children[].name"], dateFormat: "legacy" });
    eq("pick", j3, { str: a.str, child: { name: "c1" }, children: [{ name: "c2" }, { name: "c1" }] });
    var b = new tw.object.JsonAll(); b.str = null; b.strs = new tw.object.listOf.String(); b.int = 1;
    eq("empty kept", BAWJSON.toJS(b), { str: null, strs: [], int: 1 }); eq("empty dropped", BAWJSON.toJS(b, { emptyProperties: false, emptyLists: false }), { int: 1 });
    eq("valueMapper", BAWJSON.toJS(a.child, { valueMapper: function (v, p) { return p.join(".") === "qty" ? v * 10 : undefined; } }).qty, 30);
    eq("date legacy", BAWJSON.toJS(a.child, { dateFormat: "legacy" }).when, "2025-01-15 10:30:00Z");
    eq("date custom", BAWJSON.toJS(a.child, { dateFormat: function (d) { return d.getUTCFullYear(); } }).when, 2025);
    eq("typeOf", [BAWJSON.typeOf(a), BAWJSON.typeOf(a.strs), BAWJSON.typeOf(a.date), BAWJSON.typeOf(a.map), BAWJSON.typeOf(a.xml), BAWJSON.typeOf(a.record), BAWJSON.typeOf(null), BAWJSON.typeOf([]), BAWJSON.typeOf({}), BAWJSON.typeOf(new Date())], ["twObject", "twList", "twDate", "map", "xml", "twObject", "null", "array", "object", "date"]);
    eq("typeName", [BAWJSON.typeName(a), BAWJSON.typeName(a.children), BAWJSON.typeName(a.strs), BAWJSON.typeName(a.date), BAWJSON.typeName(a.map), BAWJSON.typeName(a.record), BAWJSON.typeName(a.xml), BAWJSON.typeName(new tw.object.listOf.JsonAll())], ["JsonAll", "JsonChild[]", "String[]", "Date", "Map", "Record", "XMLElement", "JsonAll[]"]);
    eq("top-level list", BAWJSON.toJS(a.children).length, 2); eq("top-level date", BAWJSON.toJS(a.date), "2025-01-15T10:30:00.123Z"); eq("top-level map", BAWJSON.toJS(a.map).k2, 2);
    eq("java values", BAWJSON.toJS({ d: new java.math.BigDecimal("1.5"), i: new java.lang.Integer(3), s: new java.lang.String("j"), b: java.lang.Boolean.TRUE, l: java.util.Arrays.asList("a", "b") }), { d: 1.5, i: 3, s: "j", b: true, l: ["a", "b"] });
});

// ---------------------------------------------------------------- 2. declared types discovered from the engine
attempt("propertyType", function () {
    var exp = { str: "String", int: "Integer", dec: "Decimal", bool: "Boolean", date: "Date", time: "Date", any: "ANY", child: "JsonChild", children: "JsonChild[]", strs: "String[]", ints: "Integer[]", decs: "Decimal[]", bools: "Boolean[]", dates: "Date[]", anys: "ANY[]", nvp: "NameValuePair", nvps: "NameValuePair[]", map: "Map", xml: "XMLElement", xmlDoc: "XMLDocument", record: "Record", self: "JsonAll", selves: "JsonAll[]", nope: null };
    for (var p in exp) eq("propertyType " + p, BAWJSON.propertyType("JsonAll", p), exp[p]);
    eq("propertyType child.when", BAWJSON.propertyType("JsonChild", "when"), "Date"); eq("propertyType child.tags", BAWJSON.propertyType("JsonChild", "tags"), "String[]"); eq("propertyType child.qty", BAWJSON.propertyType("JsonChild", "qty"), "Integer"); eq("propertyType child.price", BAWJSON.propertyType("JsonChild", "price"), "Decimal");
    eq("propertyType toolkit type", BAWJSON.propertyType("NameValuePair", "value"), "String");
    var threw = false; try { BAWJSON.propertyType("NoSuchType", "x"); } catch (e) { threw = /unknown business object type/.test(String(e)); } ok("propertyType unknown type throws", threw);
});

// ---------------------------------------------------------------- 3. JSON -> BAW
var PAYLOAD = {
    str: "2025-01-15T10:30:00Z", int: "42", dec: 1.5, bool: "true", date: "2025-01-15T10:30:00.123Z", time: "2025-01-15T10:30:00Z", any: { deep: { n: 1 }, list: [1, "a", true] },
    child: { name: "c1", qty: 3, price: "9.99", active: false, when: "2025-01-15", tags: ["t1", "t2"], unknownField: "ignored" },
    children: [{ name: "a" }, { name: "b", qty: 2 }], strs: ["x", 1, true], ints: ["7", 8], decs: [0.5, "0.25"], bools: [true, "false"], dates: ["2025-01-15T10:30:00Z", 1736937000000],
    anys: [1, "s", true, { x: "y" }, [1, 2], "2025-01-15T10:30:00Z"], nvp: { name: "n", value: "v" }, nvps: [{ name: "a", value: "1" }], map: { k1: "v1", k2: 2, k3: { name: "c2" }, k4: [1, 2] },
    xml: "<a><b>1</b></a>", xmlDoc: "<?xml version=\"1.0\"?><r><s/></r>", record: { c1: "v", c2: 3, nested: { d: true }, l: ["a"] }, self: { str: "inner", self: { str: "inner2", ints: [1] } }, selves: [{ str: "s1" }],
    extra: "not declared", "weird key!": 1
};
attempt("fromJSON into JsonAll", function () {
    var a = BAWJSON.fromJSON(JSON.stringify(PAYLOAD), "JsonAll");
    ok("is TWObject", BAWJSON.isTWObject(a)); eq("typeName", BAWJSON.typeName(a), "JsonAll");
    eq("str keeps ISO text", a.str, "2025-01-15T10:30:00Z"); eq("int from string", a.int, 42); eq("dec", a.dec, 1.5); eq("bool from string", a.bool, true);
    ok("date is TWDate", BAWJSON.isTWDate(a.date)); eq("date value", a.date.toNativeDate().getTime(), UTC); eq("time value", a.time.toNativeDate().getTime(), Date.UTC(2025, 0, 15, 10, 30, 0));
    eq("any object -> Record", BAWJSON.typeName(a.any), "Record"); eq("any deep", BAWJSON.toJS(a.any), { deep: { n: 1 }, list: [1, "a", true] });
    eq("child", BAWJSON.toJS(a.child, { dateFormat: "date" }), { name: "c1", qty: 3, price: 9.99, active: false, when: "2025-01-15", tags: ["t1", "t2"] });
    eq("children", BAWJSON.toJS(a.children), [{ name: "a" }, { name: "b", qty: 2 }]); eq("children type", BAWJSON.typeName(a.children), "JsonChild[]");
    eq("strs coerced", BAWJSON.toJS(a.strs), ["x", "1", "true"]); eq("ints", BAWJSON.toJS(a.ints), [7, 8]); eq("decs", BAWJSON.toJS(a.decs), [0.5, 0.25]); eq("bools", BAWJSON.toJS(a.bools), [true, false]);
    eq("dates", BAWJSON.toJS(a.dates, { dateFormat: "isoSeconds" }), ["2025-01-15T10:30:00Z", "2025-01-15T10:30:00Z"]);
    eq("anys", BAWJSON.toJS(a.anys, { dateFormat: "isoSeconds" }), [1, "s", true, { x: "y" }, [1, 2], "2025-01-15T10:30:00Z"]);
    eq("nvp", a.nvp.name + "=" + a.nvp.value, "n=v"); eq("nvps", a.nvps[0].value, "1");
    eq("map", BAWJSON.toJS(a.map), { k1: "v1", k2: 2, k3: { name: "c2" }, k4: [1, 2] }); ok("map is Map", BAWJSON.isTWMap(a.map));
    eq("xml", BAWJSON.typeOf(a.xml), "xml"); ok("xml text", /<b>1<\/b>/.test(String(a.xml))); ok("xmlDoc", /<s\s*\/>/.test(String(a.xmlDoc)));
    eq("record", BAWJSON.toJS(a.record), { c1: "v", c2: 3, nested: { d: true }, l: ["a"] }); eq("record type", BAWJSON.typeName(a.record), "Record");
    eq("self", a.self.self.str + "/" + a.self.self.ints[0], "inner2/1"); eq("selves", a.selves[0].str, "s1");
    var names = String(a.propertyNames); ok("unknown skipped", names.indexOf("extra") < 0 && names.indexOf("weird") < 0, names); ok("child unknown skipped", String(a.child.propertyNames).indexOf("unknownField") < 0);
    // round trip
    var back = BAWJSON.toJS(a, { dateFormat: "isoSeconds" });
    eq("round trip child", back.child.name, "c1"); eq("round trip dates list", back.dates.length, 2); eq("round trip self", back.self.self.str, "inner2");
    var again = BAWJSON.fromJS(back, "JsonAll"), back2 = BAWJSON.toJS(again, { dateFormat: "isoSeconds" }), diff = [];
    for (var key in back) if (JSON.stringify(back[key]) !== JSON.stringify(back2[key])) diff.push(key + ": " + JSON.stringify(back[key]) + " -> " + JSON.stringify(back2[key]));
    ok("second round trip", diff.length === 0, diff.join(" | "));
});
attempt("fromJS roots and scalars", function () {
    eq("root list of BO", BAWJSON.toJS(BAWJSON.fromJS([{ name: "a" }, { name: "b" }], "JsonChild[]")), [{ name: "a" }, { name: "b" }]);
    eq("root String[]", BAWJSON.toJS(BAWJSON.fromJS(["a", 1], "String[]")), ["a", "1"]); eq("root String[] single", BAWJSON.toJS(BAWJSON.fromJS("one", "String[]")), ["one"]);
    ok("root Date", BAWJSON.isTWDate(BAWJSON.fromJS("2025-01-15T10:30:00Z", "Date")) && BAWJSON.fromJS("2025-01-15T10:30:00Z", "Date").toNativeDate().getTime() === Date.UTC(2025, 0, 15, 10, 30));
    eq("root Integer", BAWJSON.fromJS("42", "Integer"), 42); eq("root Decimal", BAWJSON.fromJS("1.5", "Decimal"), 1.5); eq("root Boolean", BAWJSON.fromJS("yes", "Boolean"), true); eq("root String", BAWJSON.fromJS({ a: 1 }, "String"), "{\"a\":1}");
    eq("root Map", BAWJSON.toJS(BAWJSON.fromJS({ a: 1, b: { c: "d" } }, "Map")), { a: 1, b: { c: "d" } }); eq("root Map type", BAWJSON.typeName(BAWJSON.fromJS({ a: 1 }, "Map")), "Map");
    eq("root Record", BAWJSON.typeName(BAWJSON.fromJS({ a: 1 }, "Record")), "Record");
    eq("no type object -> Record", BAWJSON.typeName(BAWJSON.fromJS({ a: 1, b: [1, { c: 2 }] })), "Record"); eq("no type array -> ANY[]", BAWJSON.typeName(BAWJSON.fromJS([1, "a"])), "ANY[]");
    eq("no type scalar", BAWJSON.fromJS(5), 5); eq("null", BAWJSON.fromJS(null, "JsonAll"), null);
    eq("$type in ANY", BAWJSON.typeName(BAWJSON.fromJS({ any: { $type: "JsonChild", name: "x" } }, "JsonAll", { typeProperty: "$type" }).any), "JsonChild");
    eq("$type Map in ANY", BAWJSON.typeName(BAWJSON.fromJS({ any: { $type: "Map", k: "v" } }, "JsonAll", { typeProperty: "$type" }).any), "Map");
    eq("toolkit type", BAWJSON.fromJS({ name: "n", value: "v" }, "NameValuePair").value, "v"); eq("toolkit prefix", BAWJSON.fromJS({ name: "n", value: "v" }, "TWSYS.NameValuePair").name, "n");
    eq("JSON text accepted by fromJS", BAWJSON.fromJS('{"name":"t"}', "JsonChild").name, "t");
    eq("BAW values inside plain input", BAWJSON.toJS(BAWJSON.fromJS({ child: BAWJSON.fromJS({ name: "tw" }, "JsonChild"), date: BAWJSON.fromJS("2025-01-15T10:30:00Z", "Date") }, "JsonAll"), { dateFormat: "isoSeconds" }), { child: { name: "tw" }, date: "2025-01-15T10:30:00Z" });
    eq("keyMapper on the way in", BAWJSON.fromJS({ Name: "m" }, "JsonChild", { keyMapper: function (n) { return n.toLowerCase(); } }).name, "m");
    eq("types option overrides discovery", BAWJSON.fromJS({ any: "2025-01-15T10:30:00Z" }, "JsonAll", { types: { JsonAll: { any: "Date" } } }).any.toNativeDate().getTime(), Date.UTC(2025, 0, 15, 10, 30));
});
attempt("fromJS errors are JavaScript errors", function () {
    function throws(label, fn, re) { var msg = null; try { fn(); } catch (e) { msg = String(e); } ok(label, msg !== null && (!re || re.test(msg)), msg); }
    throws("integer overflow", function () { BAWJSON.fromJS({ int: 2147483648 }, "JsonAll"); }, /2147483648/);
    throws("not a number", function () { BAWJSON.fromJS({ int: "abc" }, "JsonAll"); }, /abc/);
    throws("bad date", function () { BAWJSON.fromJS({ date: "yesterday" }, "JsonAll"); }, /not a date/);
    throws("strict unknown property", function () { BAWJSON.fromJS({ nope: 1 }, "JsonAll", { strict: true }); }, /does not declare/);
    throws("unknown type", function () { BAWJSON.fromJS({ a: 1 }, "NoSuchType"); }, /unknown business object type|Cannot find/);
    throws("invalid type name", function () { BAWJSON.fromJS({ a: 1 }, "Bad<Type>"); }, /invalid type name/);
    throws("invalid record key", function () { BAWJSON.fromJS({ "bad key": 1 }, "Record"); }, /invalid property name/);
    throws("array for object", function () { BAWJSON.fromJS({ child: [1] }, "JsonAll"); }, /array/);
    eq("non-strict unknown property skipped", BAWJSON.toJS(BAWJSON.fromJS({ nope: 1, str: "s" }, "JsonAll")), { str: "s" });
});
attempt("assign and copy", function () {
    var a = new tw.object.JsonAll(); a.str = "old"; a.int = 1; a.child = new tw.object.JsonChild(); a.child.name = "old";
    BAWJSON.assign(a, { str: "new", child: { name: "new", qty: 5 }, strs: ["z"], nope: 1 });
    eq("assign merges", BAWJSON.toJS(a), { str: "new", int: 1, child: { name: "new", qty: 5 }, strs: ["z"] });
    BAWJSON.assign(a, '{"int": "9"}'); eq("assign JSON text", a.int, 9);
    var l = new tw.object.listOf.JsonChild(); l.insertIntoList(0, a.child); BAWJSON.assign(l, [{ name: "l1" }, { name: "l2" }]); eq("assign list", BAWJSON.toJS(l), [{ name: "l1" }, { name: "l2" }]);
    var c = BAWJSON.copy(a); c.child.name = "copy"; eq("copy independent", a.child.name, "new"); eq("copy type", BAWJSON.typeName(c), "JsonAll"); eq("copy content", c.str, "new");
    var lc = BAWJSON.copy(l); eq("copy list", BAWJSON.typeName(lc) + "/" + lc.listLength, "JsonChild[]/2");
});
attempt("BPMJSON compatibility", function () {
    var a = new tw.object.JsonAll(); a.str = "s"; a.int = 3; a.date = new Date(UTC); a.child = new tw.object.JsonChild(); a.child.name = "c"; a.strs = new tw.object.listOf.String(); a.bool = null;
    eq("convertTwToJS", BPMJSON.convertTwToJS(a), { str: "s", int: 3, date: "2025-01-15 10:30:00Z", child: { name: "c" } });
    eq("convertTwToJSON remove", JSON.parse(BPMJSON.convertTwToJSON(a, "date,child")), { str: "s", int: 3 });
    eq("convertTwToJSON remove array", JSON.parse(BPMJSON.convertTwToJSON(a, ["str"])).int, 3);
    var js = BPMJSON.convertJSONToTw('{"a":"","b":"2025-01-15 10:30:00Z","c":"x","d":null,"e":[1,""]}');
    eq("convertJSONToTw", [js.a, js.b instanceof Date ? js.b.getTime() : "no", js.c, js.d, js.e], [null, Date.UTC(2025, 0, 15, 10, 30), "x", null, [1, null]]);
    eq("convertJSToJSON", BPMJSON.convertJSToJSON({ a: 1 }), "{\"a\":1}"); eq("convertJSToJSON null", BPMJSON.convertJSToJSON(null), "");
    var o = { a: 1, b: 2, c: 3 }; BPMJSON.removeJSObjectAttributes(o, "a, c"); eq("removeJSObjectAttributes", o, { b: 2 });
    eq("formatUTCDate", BPMJSON.formatUTCDate(new Date(UTC)), "2025-01-15 10:30:00Z"); eq("formatUTCDate null", BPMJSON.formatUTCDate("x"), null);
    var twd = BPMJSON.parseTWDate("2025-01-15T10:30:00Z"); ok("parseTWDate", BAWJSON.isTWDate(twd) && twd.toNativeDate().getTime() === Date.UTC(2025, 0, 15, 10, 30)); eq("formatTWDate", BPMJSON.formatTWDate(twd), "2025-01-15T10:30:00Z");
    eq("convertJSONToTwObject", BPMJSON.convertJSONToTwObject('{"name":"n"}', "JsonChild").name, "n"); eq("convertJSToTw", BPMJSON.convertJSToTw({ name: "m" }, "JsonChild").name, "m");
    a.child.tags = new tw.object.listOf.String(); a.child.tags.insertIntoList(0, "t");
    eq("legacy nested list", BPMJSON.convertTwToJS(a).child.tags, ["t"]);
});
attempt("performance", function () {
    var rows = [], i; for (i = 0; i < 500; i++) rows.push({ name: "n" + i, qty: i, price: i / 4, active: i % 2 === 0, when: "2025-01-15T10:30:00Z", tags: ["a", "b"] });
    var t0 = new Date().getTime(); var list = BAWJSON.fromJS(rows, "JsonChild[]"); var t1 = new Date().getTime(); var js = BAWJSON.toJS(list); var t2 = new Date().getTime();
    eq("500 rows in", list.listLength, 500); eq("500 rows out", js.length, 500); eq("row 499", js[499].name, "n499");
    R.push("info 500 rows: fromJS " + (t1 - t0) + " ms, toJS " + (t2 - t1) + " ms, schema cache " + JSON.stringify(BAWJSON.schema.JsonChild));
});
R.push((FAILS === 0 ? "ALL PASSED " : "FAILED " + FAILS + " of ") + (PASS + FAILS) + " checks");
R.join("\n");
