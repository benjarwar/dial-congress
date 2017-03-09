var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var _ = require('../bower_components/lodash/lodash.js');

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
  var mockCritter = {
    'firstName': 'Addison',
    'lastName': 'McConnell',
    'middleNames': ['Mitchell'],
    'nicknames': ['Mitch', 'Mitchy']
  };


  it('matches first, middle, nickname, and last name permutations', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');
    var permutations = [];

    var firstName = mockCritter.firstName;
    var middleNames = mockCritter.middleNames;
    var lastName = mockCritter.lastName;
    var nicknames = mockCritter.nicknames;

    permutations.push(`${firstName} ${lastName}`);

    nicknames.forEach(function(nickname) {
      permutations.push(`${nickname} ${lastName}`);
      permutations.push(`${firstName} ${nickname} ${lastName}`);

      middleNames.forEach(function(middleName) {
        permutations.push(`${firstName} ${middleName} ${lastName}`);
        permutations.push(`${firstName} ${middleName} ${nickname} ${lastName}`);
        permutations.push(`${firstName} ${nickname} ${middleName} ${lastName}`);
        permutations.push(`${nickname} ${middleName} ${lastName}`);
      });
    });

    _.uniq(permutations).forEach(function(string) {
      expect(string.match(re).length).to.equal(1);
    });
  });


  it('matches name permutations with quoted nicknames', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');
    var permutations = [];

    var firstName = mockCritter.firstName;
    var middleNames = mockCritter.middleNames;
    var lastName = mockCritter.lastName;
    var quotedNicknames = _.map(mockCritter.nicknames, function(nickname) {
      return `"${nickname}"`;
    });

    quotedNicknames.forEach(function(nickname) {
      permutations.push(`${nickname} ${lastName}`);
      permutations.push(`${firstName} ${nickname} ${lastName}`);

      middleNames.forEach(function(middleName) {
        permutations.push(`${firstName} ${middleName} ${nickname} ${lastName}`);
        permutations.push(`${firstName} ${nickname} ${middleName} ${lastName}`);
        permutations.push(`${nickname} ${middleName} ${lastName}`);
      });
    });

    _.uniq(permutations).forEach(function(string) {
      expect(string.match(re).length).to.equal(1);
    });
  });


  it('matches various title permutations', function() {
    var mockSenator = _.cloneDeep(mockCritter);
    mockSenator.house = 'senate';

    var re = new RegExp(getRegExpString(mockSenator), 'ig');
    var permutations = [];
    var titles = ['Senator','Sen.','Congressman','Congresswoman'];

    var firstName = mockSenator.firstName;
    var middleNames = mockSenator.middleNames;
    var lastName = mockSenator.lastName;
    var nicknames = mockSenator.nicknames;

    titles.forEach(function(title) {
      nicknames.forEach(function(nickname) {
        permutations.push(`${title} ${nickname} ${lastName}`);
        permutations.push(`${title} ${firstName} ${nickname} ${lastName}`);

        middleNames.forEach(function(middleName) {
          permutations.push(`${title} ${firstName} ${middleName} ${lastName}`);
          permutations.push(`${title} ${firstName} ${middleName} ${nickname} ${lastName}`);
          permutations.push(`${title} ${firstName} ${nickname} ${middleName} ${lastName}`);
          permutations.push(`${title} ${nickname} ${middleName} ${lastName}`);
        });
      });
    });

    _.uniq(permutations).forEach(function(string) {
      expect(string.match(re).length).to.equal(1);
    });

    var mockRep = _.cloneDeep(mockCritter);
    mockRep.house = 'house';

    re = new RegExp(getRegExpString(mockRep), 'ig');
    permutations = [];
    titles = ['Representative','Rep.','Congressman','Congresswoman'];

    titles.forEach(function(title) {
      nicknames.forEach(function(nickname) {
        permutations.push(`${title} ${nickname} ${lastName}`);
        permutations.push(`${title} ${firstName} ${nickname} ${lastName}`);

        middleNames.forEach(function(middleName) {
          permutations.push(`${title} ${firstName} ${middleName} ${lastName}`);
          permutations.push(`${title} ${firstName} ${middleName} ${nickname} ${lastName}`);
          permutations.push(`${title} ${firstName} ${nickname} ${middleName} ${lastName}`);
          permutations.push(`${title} ${nickname} ${middleName} ${lastName}`);
        });
      });
    });

    _.uniq(permutations).forEach(function(string) {
      expect(string.match(re).length).to.equal(1);
    });
  });


  it('matches multiple occurences', function() {
    var string = 'In one of the oddest protests ever conceived, feminist women everywhere are getting tattoos of a phrase uttered by Sen. Mitch McConnell (R-KY) in order to show their disdain for President Trump. “Every single women has had a Mitch McConnell or 10 or 20 in her life trying to tell her how to be and what to do,” said Nora McInerny, a 34-year-old author and blogger who triggered the tattoo trend with an accidental public Facebook post. Addison Mitchell "Mitch" McConnell, Jr. (born February 20, 1942) is an American politician and the senior United States Senator from Kentucky.';
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect(string.match(re).length).to.equal(3);
  });


  it('does not match single names on their own', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect('Addison'.match(re)).to.be.null;
    expect('McConnell'.match(re)).to.be.null;
    expect('Mitchell'.match(re)).to.be.null;
    expect('Mitch'.match(re)).to.be.null;
    expect('Mitchy'.match(re)).to.be.null;
    expect('There is no Mitch but McConnell.'.match(re)).to.be.null;
  });


  it('does not match misspellings', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect('Match McConnell'.match(re)).to.be.null;
    expect('Addison McCornell'.match(re)).to.be.null;
  });


  it('does not match abbreviated "sen." at end of previous sentence', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect('He wore the nicest lederhosen. McConnell said some things.'.match(re)).to.be.null;
  });


  it('enforces spaces between names', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect('Notmitch McConnell'.match(re)).to.be.null;
    expect('Addison McConnellnot'.match(re)).to.be.null;
  });


  it('rejects punctuation unless included in a name', function() {
    var punctuatedCritter =   {
      'lastName': 'Butterfield',
      'firstName': 'George',
      'nicknames': [
        'George Kenneth',
        'G. K.',
        'G.K.'
      ]
    };
    var re = new RegExp(getRegExpString(punctuatedCritter), 'ig');

    expect('G.K. Butterfield'.match(re).length).to.equal(1);
    expect('G. K. Butterfield'.match(re).length).to.equal(1);
  });


  it('matches if there is excessive white space between names', function() {
    var re = new RegExp(getRegExpString(mockCritter), 'ig');

    expect('Mitch     McConnell'.match(re).length).to.equal(1);
    expect('  Addison  Mitchy     McConnell'.match(re).length).to.equal(1);
  });
});
