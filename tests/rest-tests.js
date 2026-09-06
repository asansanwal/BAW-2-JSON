/* REST payload validation of baw-json.js: real Process REST API responses (tests/data/*.json, captured from a Process Center) and
   Swagger-shaped Process REST v2 payloads are converted JSON -> business object -> JSON and compared field by field.
   The harness (tools/bawjson_test.py) injects  var SAMPLES = {...}; var CASES = [[type, sampleName, path], ...];  before this script. */
var R = [], PASS = 0, FAILS = 0;
function ok(label, cond, detail) { if (cond) { PASS++; R.push("ok   " + label); } else { FAILS++; R.push("FAIL " + label + (detail !== undefined ? " -> " + String(detail).substring(0, 400) : "")); } }
function sanitize(n) { return n.replace(/[^A-Za-z0-9_]/g, "_"); }
function canon(v) {                                     // comparison form: dates -> epoch, nulls dropped, keys sanitized
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string") { var d = BAWJSON.parseDate(v); return (d && /^\d{4}-\d{2}-\d{2}T/.test(v)) ? "date:" + d.getTime() : v; }
    if (Object.prototype.toString.call(v) === "[object Array]") { var a = []; for (var i = 0; i < v.length; i++) { var x = canon(v[i]); a.push(x === undefined ? null : x); } return a; }
    if (typeof v === "object") { var o = {}; for (var k in v) { var c = canon(v[k]); if (c !== undefined) o[sanitize(k)] = c; } return o; }
    return v;
}
function diff(a, b, path, out) {
    if (out.length > 25) return out;
    var ta = Object.prototype.toString.call(a), tb = Object.prototype.toString.call(b);
    if (ta !== tb) { out.push(path + ": " + JSON.stringify(a) + " vs " + JSON.stringify(b)); return out; }
    if (ta === "[object Array]") { if (a.length !== b.length) out.push(path + ": length " + a.length + " vs " + b.length); for (var i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], path + "[" + i + "]", out); return out; }
    if (ta === "[object Object]") { var k; for (k in a) diff(a[k], b[k], path + "." + k, out); for (k in b) if (!(k in a)) out.push(path + "." + k + ": extra " + JSON.stringify(b[k])); return out; }
    if (a !== b) out.push(path + ": " + JSON.stringify(a) + " vs " + JSON.stringify(b));
    return out;
}
function get(v, path) { for (var i = 0; i < path.length; i++) v = v[path[i]]; return v; }
var totalProps = 0;
for (var c = 0; c < CASES.length; c++) {
    var type = CASES[c][0], name = CASES[c][1], original = get(SAMPLES[name], CASES[c][2]);
    try {
        var t0 = new Date().getTime();
        var bo = BAWJSON.fromJS(original, type, { keyMapper: function (n) { return sanitize(n); } });
        var back = BAWJSON.toJS(bo), t1 = new Date().getTime();
        var problems = diff(canon(original), canon(back), "$", []);
        var n = JSON.stringify(original).split('":').length - 1; totalProps += n;
        ok(name + " -> " + type + " -> JSON (" + n + " fields, " + (t1 - t0) + " ms)", problems.length === 0, problems.join(" | "));
        ok(name + " typeName", BAWJSON.typeName(bo) === type, BAWJSON.typeName(bo));
        var again = BAWJSON.toJS(BAWJSON.fromJS(back, type));
        ok(name + " stable on a second pass", diff(canon(back), canon(again), "$", []).length === 0, diff(canon(back), canon(again), "$", []).join(" | "));
    } catch (e) { ok(name + " -> " + type, false, "threw " + String(e).replace(/\n/g, " ")); }
}
// legacy API on a real response, the way existing scripts use it: BPMJSON.convertJSONToTw(response.content)
try {
    var js = BPMJSON.convertJSONToTw(JSON.stringify(SAMPLES["v1-process-all.json"]));
    ok("BPMJSON.convertJSONToTw on a real process response", js.data.piid === SAMPLES["v1-process-all.json"].data.piid && js.data.creationTime instanceof Date, JSON.stringify(js.data.creationTime));
    var tw1 = BAWJSON.fromJS(SAMPLES["v1-process-all.json"].data, "V1Process");
    ok("BPMJSON.convertTwToJSON on the converted object", JSON.parse(BPMJSON.convertTwToJSON(tw1, "diagram,executionTree")).piid === tw1.piid);
} catch (e) { ok("BPMJSON on real responses", false, String(e)); }
R.push("info " + CASES.length + " payloads, " + totalProps + " fields");
R.push((FAILS === 0 ? "ALL PASSED " : "FAILED " + FAILS + " of ") + (PASS + FAILS) + " checks");
R.join("\n");
