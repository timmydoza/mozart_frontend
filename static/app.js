var minuet = {
  treble: [],
  bass: []
};

var allNotes = {
  treble: [],
  trebleb: [],
  bass: []
};

var diceroll, midi;
$.get('/music', function(data, status, xhr) {
  diceroll = xhr.getResponseHeader('diceroll');
  JSON.parse(xhr.getResponseHeader('notes')).forEach(function(bar) {
    minuet.treble.push(bar.treble);
    minuet.bass.push(bar.bass);
  });
  MIDI.Player.BPM = 80;
  MIDI.Player.loadFile(data, MIDI.Player.start);
  MIDI.Player.addListener(function(data) {
    if (data.channel) console.log(data.note);
  });
  render();
});

var RESTS = {
  treble: 'b/4',
  bass: 'd/3'
}

function getNotes(clef, start, stop) {
  var result = [];
  //each measure
  for (var i = start; i <= stop; i++) {
    //each note in measure
    for (var j = 0; j < minuet[clef][i].length; j++) {
      //if note is a single note
      result.push(addNotes(minuet[clef][i][j], clef));
    }
    if (i !== stop) {
      result.push(new Vex.Flow.BarNote(1));
    }
  }
  return result;
};

function addNotes(_note, clef) {
  var note = _note[0];
  var duration = _note[1];
  //if it is a rest
  if (typeof duration === 'undefined') {
    return new Vex.Flow.StaveNote({clef: clef, keys: [RESTS[clef]], duration: note + 'r'});
  }
  //if there is one note
  if (typeof note === 'string') {
    var result = new Vex.Flow.StaveNote({clef: clef, keys: [note], duration: duration});
    //if there is an accidental
    if (note.length === 4) {
      result.addAccidental(0, new Vex.Flow.Accidental(note[1]));
    }
    return result;
  }
  //if it is a chord
  if (Array.isArray(note)) {
    var result = new Vex.Flow.StaveNote({clef: clef, keys: note, duration: duration});
    for (var i = 0; i < note.length; i++) {
      if (note[i].length === 4) {
        result.addAccidental(i, new Vex.Flow.Accidental(note[i][1]));
      }
    }
    return result;
  }
}

function render() {
  drawGrandStave(getNotes('treble', 0, 5), getNotes('bass', 0, 5), 0);
  drawGrandStave(getNotes('treble', 6, 11), getNotes('bass', 6, 11), 230);
  drawGrandStave(getNotes('treble', 12, 17), getNotes('bass', 12, 17), 460);
  drawGrandStave(getNotes('treble', 18, 23), getNotes('bass', 18, 23), 680, true);
}


var canvas = $('#music')[0];
var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.SVG);
var ctx = renderer.getContext();
ctx.scale(0.8, 0.8);

function drawGrandStave(trebleNotes, bassNotes, verticalPosition, final) {

  var upperStave = new Vex.Flow.Stave(30, verticalPosition, 960);
  upperStave.addClef("treble");//.setContext(ctx).draw();
  upperStave.addTimeSignature('3/8');

  var lowerStave = new Vex.Flow.Stave(30, verticalPosition + 100, 960);
  lowerStave.addClef("bass");//.setContext(ctx).draw();
  lowerStave.addTimeSignature('3/8');

  var brace = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(3);
  var lineLeft = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(1);
  if (final) {
    var lineRight = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(6);
  } else {
    var lineRight = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(0);
  }

  var voice1 = new Vex.Flow.Voice({
    num_beats: 18,
    beat_value: 8,
    resolution: Vex.Flow.RESOLUTION
  });

  var voice2 = new Vex.Flow.Voice({
    num_beats: 18,
    beat_value: 8,
    resolution: Vex.Flow.RESOLUTION
  });

  voice1.addTickables(trebleNotes);
  voice2.addTickables(bassNotes);

  var trebleBeams = Vex.Flow.Beam.applyAndGetBeams(voice1, null, [new Vex.Flow.Fraction(3, 8)]);
  var bassBeams = Vex.Flow.Beam.applyAndGetBeams(voice2, null, [new Vex.Flow.Fraction(3, 8)]);
    allNotes.treble.push(trebleNotes);
    allNotes.trebleb.push(trebleBeams);
    allNotes.bass.concat(bassNotes);

  var formatter = new Vex.Flow.Formatter();
  formatter.format([voice2, voice1], 880);

  var max_x = Math.max(upperStave.getNoteStartX(), lowerStave.getNoteStartX());
  upperStave.setNoteStartX(max_x);
  lowerStave.setNoteStartX(max_x);

  upperStave.setContext(ctx).draw();
  lowerStave.setContext(ctx).draw();
  brace.setContext(ctx).draw();
  lineLeft.setContext(ctx).draw();
  lineRight.setContext(ctx).draw();
  voice1.draw(ctx, upperStave);
  voice2.draw(ctx, lowerStave);
  trebleBeams.forEach(function(beam) {
    beam.setContext(ctx).draw();
  });
  bassBeams.forEach(function(beam) {
    beam.setContext(ctx).draw();
  });


}

function changeColor(element, color) {
  Vex.forEach($(element).find('*'), function(child) {
    child.setAttribute('fill', color);
    child.setAttribute('stroke', color);
  });
}
