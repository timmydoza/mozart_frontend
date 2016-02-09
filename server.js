var mozart = require(__dirname + '/lib/mozart-dice-game');
var notes = require(__dirname + '/lib/vex_notes');
var compression = require('compression');
var express = require('express');
var app = express();

app.use(compression());
app.use('/', express.static('static'));
app.get('/music', function(req, res) {
  var minuet = mozart.getMinuet(40);
  var vexNotes = [];
  var midi = "";
  minuet.measures.forEach(function(measure) {
    vexNotes.push(notes[measure]);
  });

  res.writeHead(200, {
    'Content-Type': 'application/x-midi',
    'notes': JSON.stringify(vexNotes),
    'diceroll': JSON.stringify(minuet.dice)
  });
  var midi = new Buffer(minuet.bytes, 'binary').toString('base64');
  debugger;
  res.end('data:audio/midi;base64,' + midi);
});

app.listen(3000, function() {
  console.log('server up');
});
