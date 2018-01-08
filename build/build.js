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

(async () => {
    // https://github.com/GoogleChrome/puppeteer/issues/1260
    var browser = await puppeteer.launch({
        headless: false,
        args: [
          '--headless',
          '--hide-scrollbars',
          '--mute-audio'
        ]
    });

    etpl.config({
        commandOpen: '{{',
        commandClose: '}}'
    });

    var basicRender = etpl.compile(fs.readFileSync('./templates/basic.html', 'utf-8'));

    glob(__dirname + '/../examples-src/*/README.md', async function (err, files) {
        for (var fileName of files) {
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

            // Do screenshot
            var page = await browser.newPage();
            var url = `http://127.0.0.1/claygl-examples/build/screenshot.html?${basename}`;
            page.on('pageerror', function (err) {
                console.log(err.toString());
            })
            page.on('console', function (msg) {
                console.log(msg.text);
            })
            console.log(url);
            await page.goto(url);
            await waitTime(300);
            await page.screenshot({path: __dirname + '/../thumb/' + basename + '.png' });
            await page.close();
        }

        await browser.close();
    });
})()