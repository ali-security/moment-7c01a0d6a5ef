// Fails unless every shipped bundle in an extracted npm package reflects the
// security fixes carried by that same package's src/ tree.
//
// Usage: node scripts/seal_check_bundles.js <extracted package dir>
//
// For each fix marker the expectation is taken from the shipped src/ file:
// when src carries the fix, EVERY bundle must carry it too; when src does not
// (the unpatched base build), no bundle may carry it. The pre-CVE-2026-17495
// locale check name.match('^[^/\\\\]*$') must be absent from every bundle
// whenever src no longer carries it.
'use strict';

var fs = require('fs'),
    path = require('path'),
    pkg = process.argv[2],
    bundles = [
        'moment.js',
        'dist/moment.js',
        'min/moment.min.js',
        'min/moment-with-locales.js',
        'min/moment-with-locales.min.js',
    ],
    LOCALE_RE = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
    markers = [
        {
            name: 'CVE-2026-17495 canonical locale name check',
            src: 'src/lib/locale/locales.js',
            inSrc: function (text) {
                return (
                    text.indexOf(
                        "typeof name === 'string' && " + LOCALE_RE
                    ) !== -1
                );
            },
            inBundle: function (text) {
                // minified bundles rename `name` and rewrite the typeof
                // comparison, so require the regex literal with a typeof
                // check right before it
                var idx = text.indexOf(LOCALE_RE);
                while (idx !== -1) {
                    if (text.slice(Math.max(0, idx - 60), idx).indexOf('typeof') !== -1) {
                        return true;
                    }
                    idx = text.indexOf(LOCALE_RE, idx + 1);
                }
                return false;
            },
        },
        {
            name: 'CVE-2022-31129 RFC2822 comment regex',
            src: 'src/lib/create/from-string.js',
            literal: '/\\([^()]*\\)|[\\n\\t]/g',
        },
        {
            name: 'CVE-2017-18214 bounded matchWord',
            src: 'src/lib/parse/regex.js',
            literal: '[0-9]{0,256}',
        },
        {
            name: 'old name.match locale check (must be gone once fixed)',
            src: 'src/lib/locale/locales.js',
            literal: "^[^/\\\\\\\\]*$",
            old: true,
        },
    ],
    failures = 0;

function read(rel) {
    return fs.readFileSync(path.join(pkg, rel), 'utf8');
}

function has(marker, text, isSrc) {
    if (marker.literal) {
        return text.indexOf(marker.literal) !== -1;
    }
    return isSrc ? marker.inSrc(text) : marker.inBundle(text);
}

markers.forEach(function (marker) {
    var expected = has(marker, read(marker.src), true);
    console.log(
        (marker.old ? '[old] ' : '[fix] ') +
            marker.name +
            ': ' +
            marker.src +
            (expected ? ' carries it' : ' does not carry it')
    );
    bundles.forEach(function (bundle) {
        var actual = has(marker, read(bundle), false),
            ok = actual === expected;
        console.log(
            '  ' + (ok ? 'ok   ' : 'FAIL ') + bundle + (actual ? ' carries it' : ' does not carry it')
        );
        if (!ok) {
            failures++;
        }
    });
});

if (failures) {
    console.error(failures + ' bundle(s) out of sync with the shipped src/');
    process.exit(1);
}
console.log('all ' + bundles.length + ' bundles match the shipped src/ for every marker');
