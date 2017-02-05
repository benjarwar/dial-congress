var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');

var document = {};
var $ = function(context) {
  if (this.__proto__.constructor !== $) {
    return new $(context);
  }

  this.context = context;
  this.ready = function() {}
};

var performance = {
  now: function() {}
};

contentJavascript = fs.readFileSync(path.resolve(__dirname, '../js/content.js'),'utf8');
eval(contentJavascript);

describe('getRegExpString', function() {
  var senator =   {
    'firstName': 'Bernard',
    'lastName': 'Sanders',
    'nicknames': [
      'Bernie',
      'Barnie'
    ]
  };

  var re = new RegExp(getRegExpString(senator), 'ig');

  it('matches first, middle, and last name permutations', function() {
    expect('Bernard Sanders'.match(re).length).to.equal(1);
    expect('Bernard Birdie Sanders'.match(re).length).to.equal(1);
    expect('Bernard Birdie Bird Sanders'.match(re).length).to.equal(1);
    expect('Bernard B. Sanders'.match(re).length).to.equal(1);
  });

  it('matches varius nickname permutations', function() {
    expect('Bernie Sanders'.match(re).length).to.equal(1);
    expect('Bernie Birdie Sanders'.match(re).length).to.equal(1);
    expect('Bernie Birdie Bird Sanders'.match(re).length).to.equal(1);
    expect('Bernie B. Sanders'.match(re).length).to.equal(1);
    expect('Barnie Sanders'.match(re).length).to.equal(1);
    expect('Barnie Birdie Sanders'.match(re).length).to.equal(1);
    expect('Barnie Birdie Bird Sanders'.match(re).length).to.equal(1);
    expect('Barnie B. Sanders'.match(re).length).to.equal(1);
  });

  it('matches quoted nicknames', function() {
    expect('Bernard "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Bernard \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Bernie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Bernie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Barnie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Barnie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Bernard \'Birdie Bee\' Sanders'.match(re).length).to.equal(1);
    expect('Bernard \'Birdie Bee\' Sanders'.match(re).length).to.equal(1);
    expect('Bernie \'Birdie Bee\' Sanders'.match(re).length).to.equal(1);
    expect('Bernie \'Birdie Bee\' Sanders'.match(re).length).to.equal(1);
  });

  it('matches various title permutations', function() {
    expect('Senator Bernard Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernard Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernard Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernard Sanders'.match(re).length).to.equal(1);
    expect('Senator Sanders'.match(re).length).to.equal(1);
    expect('Sen. Sanders'.match(re).length).to.equal(1);
    expect('Congressman Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Sanders'.match(re).length).to.equal(1);
  });

  it('matches various title and nickname permutations', function() {
    expect('Senator Bernie Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernie Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernie Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernie Sanders'.match(re).length).to.equal(1);
    expect('Senator Barnie Sanders'.match(re).length).to.equal(1);
    expect('Sen. Barnie Sanders'.match(re).length).to.equal(1);
    expect('Congressman Barnie Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Barnie Sanders'.match(re).length).to.equal(1);
    expect('Senator Bernie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernie "Birdie" Sanders'.match(re).length).to.equal(1);
    expect('Senator Bernie "Birdie" B. Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernie "Birdie" B. Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernie "Birdie" B. Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernie "Birdie" B. Sanders'.match(re).length).to.equal(1);
    expect('Senator Bernie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernie \'Birdie\' Sanders'.match(re).length).to.equal(1);
    expect('Senator Bernie \'Birdie\' B. Sanders'.match(re).length).to.equal(1);
    expect('Sen. Bernie \'Birdie\' B. Sanders'.match(re).length).to.equal(1);
    expect('Congressman Bernie \'Birdie\' B. Sanders'.match(re).length).to.equal(1);
    expect('Congresswoman Bernie \'Birdie\' B. Sanders'.match(re).length).to.equal(1);
  });

  it('matches multiple occurences', function() {
    var string = 'Let me be as clear as Bernard Sanders can be. This election is not about and has never been about Hillary Clinton or Donald Trump or Bernie Sanders or Senator Sanders or Bernie "Birdie" Sanders or any of the other candidates who sought the presidency. This election is not about political gossip, it\'s not about polls, it\'s not about campaign strategy, it is not about Sen. Barnie, it is not about Congressman Bernard, it is not about all the things that the media spends so much time discussing.';

    expect(string.match(re).length).to.eql(4);
  });

  it('does not match single names on their own', function() {
    expect('Bernard'.match(re)).to.be.null;
    expect('Sanders'.match(re)).to.be.null;
    expect('Bernie'.match(re)).to.be.null;
    expect('Barnie'.match(re)).to.be.null;
    expect('I love Bernie'.match(re)).to.be.null;
    expect('Colonel Sanders'.match(re)).to.be.null;
    expect('Bernie would have won.'.match(re)).to.be.null;
    expect('But Barnie wouldn\'t have won.'.match(re)).to.be.null;
  });

  it('does not match misspellings', function() {
    expect('Bernerd Sanders'.match(re)).to.be.null;
    expect('Bernie Sunders'.match(re)).to.be.null;
  });

  it('does not match more than two middle words', function() {
    expect('Bernard Might Have Won Sanders'.match(re)).to.be.null;
  });

  it('does not match abbreviated "sen." at end of previous sentence', function() {
    expect('He wore the nicest lederhosen. Sanders is a nice guy.'.match(re)).to.be.null;
  });

  it('enforces spaces between wildcard middle names', function() {
    expect('Bernard Not-Sanders'.match(re)).to.be.null;
  });

  it('enforces word boundaries around names', function() {
    expect('Notbernard Sanders'.match(re)).to.be.null;
    expect('Notbernie Sanders'.match(re)).to.be.null;
    expect('Bernardy Sanders'.match(re)).to.be.null;
    expect('Bernied Sanders'.match(re)).to.be.null;
    expect('Bernard Sanderses'.match(re)).to.be.null;
    expect('Bernie Sandersing'.match(re)).to.be.null;
    expect('Bernard Uhsanders'.match(re)).to.be.null;
    expect('Bernie Shasanders'.match(re)).to.be.null;
  });
});
