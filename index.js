var mozart = require('mozart-dice-game');
var notes = require(__dirname + '/lib/vex_notes');
var compression = require('compression');
var app = require('router')();
var static = require('serve-static');

app.use(compression());
app.use('/', static(__dirname + '/static'));
app.get('/music', function(req, res) {
  var minuet = mozart.getMinuet(80);
  var vexNotes = [];
  minuet.measures.forEach(function(measure) {
    vexNotes.push(notes[measure]);
  });
  var midi = new Buffer(minuet.bytes, 'binary').toString('base64');
  res.json({
    notes: vexNotes,
    dicerolls: minuet.dice,
    midi: 'data:audio/midi;base64,' + midi
  });
});

module.exports = app;
