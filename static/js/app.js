var Mozart = (function(){
  //beats per minute
  MIDI.Player.BPM = 80;

  //Rest positions for treble and bass clef
  var RESTS = {
    treble: 'b/4',
    bass: 'd/3'
  }

  //Ininialize VexFlow renderer and canvas drawing context
  var canvas = $('#music')[0];
  var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
  var ctx = renderer.getContext();
  ctx.scale(0.75, 0.75);

  var dicerolls, midi, trebleTime, bassTime, minuet, allNotes;
  var playedTreble = 0;
  var playedBass = 0;

  //gets new midi file and VexFlow notes from server
  function getNewMinuet(callback) {
    minuet = {
      treble: [],
      bass: []
    };
    allNotes = {
      treble: [],
      bass: []
    };
    $.get('music', function(data, status, xhr) {
      dicerolls = data.dicerolls;
      data.notes.forEach(function(bar) {
        minuet.treble.push(bar.treble);
        minuet.bass.push(bar.bass);
      });
      midi = data.midi;
      if (typeof callback === 'function') callback();
      render();
    });
  }

  function startMidi(callback) {
    //resets values used by highlightNotes function
    trebleTime = 0;
    bassTime = 0;
    playedTreble = 0;
    playedBass = 0;
    MIDI.Player.addListener(function(data) {
      //this function is called for every midi event in the midi file
      highlightNotes(data, callback);
    });
    MIDI.Player.loadFile(midi, MIDI.Player.start);
  }

  function stopMidi() {
    MIDI.Player.stop();
    //change the current highlighted notes to black
    paintNote(allNotes.treble[playedTreble - 1], 'black');
    paintNote(allNotes.bass[playedBass - 1], 'black');
    //alternatively, render()
  }

  function downloadMidi() {
    window.location = midi;
  }

  function loadMidiInstrument(callback, format) {
    MIDI.loadPlugin({
      onsuccess: function() {
        //this changes the instrument for channel 1 to piano
        MIDI.programChange(1, 0);
        callback();
      },
      targetFormat: format || 'ogg', // or 'mp3' for lower quality
      instrument: 'acoustic_grand_piano'
    });
  }

  //the noteObjs passed in to this function contain barline objects, which should
  //not be highlighted by the highlightNotes function.  This function strips only the
  //note objects and saves them to the allNotes object.
  function saveNotes(noteObjs, clef) {
    for (var i = 0; i < noteObjs.length; i++) {
      if (noteObjs[i].clef && noteObjs[i].noteType === 'n') {
        allNotes[clef].push(noteObjs[i]);
      }
    }
  }

  //Paints the note head and note stem of a given note object
  function paintNote(note, color) {
    note.stem.setStyle({strokeStyle: color, fillStyle: color}).draw();
    note.note_heads.forEach(function(noteHead) {
      noteHead.setStyle({strokeStyle: color, fillStyle: color}).draw();
    });
  }

  function highlightNotes(data, callback) {
    //for the purpose of highlighting the note(s) that are being played, chords
    //should be treated as a single note.  We don't want to paint all the notes in
    //a chord in sequence, but we want to paint them all at once.  If data.now equals
    //trebleTime, then we know that the noteOn event is part of a chord, so it is
    //ignored
    if (data.channel === 0 && data.message === 144 && data.now !== trebleTime) {
      paintNote(allNotes.treble[playedTreble], 'red');
      trebleTime = data.now;
      //paints the previous note(s) black for every note except for the very first
      if (playedTreble !== 0) {
        paintNote(allNotes.treble[playedTreble - 1], 'black');
      }
      playedTreble++;
    }
    if (data.channel === 1 && data.message === 144 && data.now !== bassTime) {
      paintNote(allNotes.bass[playedBass], 'red');
      bassTime = data.now;
      //paints the previous note(s) black for every note except for the very first
      if (playedBass !== 0) {
        paintNote(allNotes.bass[playedBass - 1], 'black');
      }
      playedBass++;
    }
    //if the song is over
    if (data.now === data.end) {
      setTimeout(function() {
        callback();
        //paint the last two notes black after one second
        paintNote(allNotes.treble[playedTreble - 1], 'black');
        paintNote(allNotes.bass[playedBass - 1], 'black');
      }, 1000);
    }
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
      //if it is not the last measure, add a barline
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
    //clear the canvas
    ctx.clearRect(0, 0, 1100, 1300);
    //generate VexFlow notes from AJAX call and render the stave for each of the
    //four grand staves
    drawGrandStave(getNotes('treble', 0, 5), getNotes('bass', 0, 5), 75);
    drawGrandStave(getNotes('treble', 6, 11), getNotes('bass', 6, 11), 365);
    drawGrandStave(getNotes('treble', 12, 17), getNotes('bass', 12, 17), 655);
    drawGrandStave(getNotes('treble', 18, 23), getNotes('bass', 18, 23), 945, true);
  }

  function drawGrandStave(trebleNotes, bassNotes, verticalPosition, final) {
    //save all note objects (removing bar line objects) to allNotes
    saveNotes(trebleNotes, 'treble');
    saveNotes(bassNotes, 'bass');

    //create stave and give it a treble clef and time signature of 3/8
    var upperStave = new Vex.Flow.Stave(45, verticalPosition, 960);
    upperStave.addClef("treble");
    upperStave.addTimeSignature('3/8');

    //create stave and give it a bass clef and time signature of 3/8
    var lowerStave = new Vex.Flow.Stave(45, verticalPosition + 100, 960);
    lowerStave.addClef("bass");
    lowerStave.addTimeSignature('3/8');

    //create lefthand brace between treble and bass staves
    var brace = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(3);
    var lineLeft = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(1);
    if (final) {
      //create double bar line at the right end of the stave if it is the last stave
      var lineRight = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(6);
    } else {
      //otherwise, create single bar line at right end of stave
      var lineRight = new Vex.Flow.StaveConnector(upperStave, lowerStave).setType(0);
    }

    //create VexFlow voice for treble stave with six measures worth of 'ticks'
    var voice1 = new Vex.Flow.Voice({
      num_beats: 18,
      beat_value: 8,
      resolution: Vex.Flow.RESOLUTION
    });

    //create VexFlow voice for bass stave with six measures worth of 'ticks'
    var voice2 = new Vex.Flow.Voice({
      num_beats: 18,
      beat_value: 8,
      resolution: Vex.Flow.RESOLUTION
    });

    //add VexFlow note objects to the voices
    voice1.addTickables(trebleNotes);
    voice2.addTickables(bassNotes);

    //automatically apply the note beams for each voice
    var trebleBeams = Vex.Flow.Beam.applyAndGetBeams(voice1, null, [new Vex.Flow.Fraction(3, 8)]);
    var bassBeams = Vex.Flow.Beam.applyAndGetBeams(voice2, null, [new Vex.Flow.Fraction(3, 8)]);

    //vertically align the notes in each stave
    var formatter = new Vex.Flow.Formatter();
    formatter.format([voice2, voice1], 880);
    var max_x = Math.max(upperStave.getNoteStartX(), lowerStave.getNoteStartX());
    upperStave.setNoteStartX(max_x);
    lowerStave.setNoteStartX(max_x);

    //draw everything
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

  //exports
  return {
    loadMidiInstrument: loadMidiInstrument,
    getNewMinuet: getNewMinuet,
    startMidi: startMidi,
    stopMidi: stopMidi,
    downloadMidi: downloadMidi,
    get dicerolls() {
      return dicerolls;
    }
  };
})();

//event listeners for buttons
$(function() {
  $('button').mouseup(function() {
    this.blur();
  });
  var newMinuet = $('#newMinuet');
  var playMinuet = $('#playMinuet');
  var downloadMidi = $('#downloadMidi');
  var aboutButton = $('#aboutButton');
  var hideButton = $('#hideButton');
  var loadingWheel = $('#loading-wheel');

  newMinuet.click(Mozart.getNewMinuet);

  playMinuet.click(function(e) {
    if (MIDI.Player.playing) {
      Mozart.stopMidi();
      playMinuet.text('Play');
      newMinuet.attr('disabled', false);
      downloadMidi.attr('disabled', false);
      aboutButton.attr('disabled', false);
    } else {
      Mozart.startMidi(function() {
        Mozart.stopMidi();
        playMinuet.text('Play');
        newMinuet.attr('disabled', false);
        downloadMidi.attr('disabled', false);
        aboutButton.attr('disabled', false);
      });
      playMinuet.text('Stop');
      newMinuet.attr('disabled', true);
      downloadMidi.attr('disabled', true);
      aboutButton.attr('disabled', true);
    }
  });

  aboutButton.click(function() {
    $('.aboutsection').addClass('display');
  });

  hideButton.click(function() {
    $('.aboutsection').removeClass('display');
  });

  downloadMidi.click(Mozart.downloadMidi);

  Mozart.loadMidiInstrument(function() {
    playMinuet.text('Play');
    playMinuet.attr('disabled', false);
    loadingWheel.hide();
  });

  Mozart.getNewMinuet(function() {
    newMinuet.attr('disabled', false);
    downloadMidi.attr('disabled', false);
  });
});
