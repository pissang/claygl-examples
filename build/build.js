var fs = require('fs');
var etpl = require('etpl');
var glob = require('glob');
var path = require('path');
var marked = require('marked');
var fm = require('front-matter');
var puppeteer = require('puppeteer');

function waitTime(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function parseMarkdownExampleLinks() {
    // TODO
}

var BUILD_THUMBS = true;
var BASE_URL = 'http://127.0.0.1/claygl-examples/';

(async () => {
    // https://github.com/GoogleChrome/puppeteer/issues/1260
    if (BUILD_THUMBS) {
        var browser = await puppeteer.launch({
            headless: false,
            args: [
              '--headless',
              '--hide-scrollbars',
              '--mute-audio'
            ]
        });
    }
    etpl.config({
        commandOpen: '{{',
        commandClose: '}}'
    });

    var basicRender = etpl.compile(fs.readFileSync('./templates/basic.html', 'utf-8'));
    var indexRender = etpl.compile(fs.readFileSync('./templates/index.html', 'utf-8'));


    // TODO puppeteer will have Navigation Timeout Exceeded: 30000ms exceeded error in these examples.
    var screenshotBlackList = [
        'basicFlyingCubes'
    ];

    glob(__dirname + '/../examples-src/*/README.md', async function (err, files) {

        var exampleList = [];

        for (var fileName of files) {
            var baseDir = path.dirname(fileName);
            var basename = path.basename(baseDir);

            var jsCode = fs.readFileSync(baseDir + '/' + basename + '.js', 'utf-8');

            var mdText = fs.readFileSync(fileName, 'utf-8');
            var fmResult = fm(mdText);

            var extraScripts = fmResult.attributes.scripts ? fmResult.attributes.scripts.split(',').map(str => str.trim()) : [];

            var descHTML = marked(fmResult.body);

            var finalHTML = basicRender({
                title: fmResult.attributes.title,
                description: descHTML,
                mainCode: jsCode,
                scripts: extraScripts
            });

            fs.writeFileSync(__dirname + '/../examples/' + basename + '.html', finalHTML, 'utf-8');

            // Do screenshot
            if (BUILD_THUMBS && screenshotBlackList.indexOf(basename) < 0) {
                var page = await browser.newPage();
                var url = `${BASE_URL}/build/screenshot.html?${basename}`;
                for (var scriptUrl of extraScripts) {
                    url += ',' + scriptUrl;
                }
                page.on('pageerror', function (err) {
                    console.log(err.toString());
                });
                page.on('console', function (msg) {
                    console.log(msg.text);
                });
                console.log(basename);
                // https://stackoverflow.com/questions/46160929/puppeteer-wait-for-all-images-to-load-then-take-screenshot
                await page.goto(url, {'waitUntil' : 'networkidle0'});
                await page.screenshot({path: __dirname + '/../thumb/' + basename + '.png' });
                await page.close();
            }

            exampleList.push({
                category: fmResult.attributes.category || 'basic',
                name: basename,
                title: fmResult.attributes.title
            });
        }

        if (BUILD_THUMBS) {
            await browser.close();
        }

        var indexHTML = indexRender({
            examples: exampleList
        });
        fs.writeFileSync('../index.html', indexHTML, 'utf-8');
    });
})()