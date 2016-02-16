var mozart = require(__dirname + '/lib/mozart-dice-game');
var notes = require(__dirname + '/lib/vex_notes');
var compression = require('compression');
var express = require('express');
var app = express();

app.use(compression());
app.use('/', express.static('static'));
app.get('/music', function(req, res) {
  var minuet = mozart.getMinuet(4);
  var vexNotes = [];
  minuet.measures.forEach(function(measure) {
    vexNotes.push(notes[measure]);
  });
  var midi = new Buffer(minuet.bytes, 'binary').toString('base64');
  res.json({
    notes: vexNotes,
    dicerolls: minuet.dice,
    midi: 'base64,' + midi
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log('server up');
});
