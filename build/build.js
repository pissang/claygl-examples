var fs = require('fs');
var etpl = require('etpl');
var glob = require('glob');
var path = require('path');
var marked = require('marked');
var fm = require('front-matter');

etpl.config({
    commandOpen: '{{',
    commandClose: '}}'
});

var basicRender = etpl.compile(fs.readFileSync('./templates/basic.html', 'utf-8'));

glob(__dirname + '/../examples-src/*/README.md', function (err, files) {
    files.forEach(function (fileName) {
        var baseDir = path.dirname(fileName);
        var basename = path.basename(baseDir);

        var jsCode = fs.readFileSync(baseDir + '/' + basename + '.js', 'utf-8');

        var mdText = fs.readFileSync(fileName, 'utf-8');
        var fmResult = fm(mdText);

        var descHTML = marked(fmResult.body);

        var finalHTML = basicRender({
            title: fmResult.attributes.title,
            description: descHTML,
            mainCode: jsCode
        });

        fs.writeFileSync(__dirname + '/../examples/' + basename + '.html', finalHTML, 'utf-8');
    });
});
