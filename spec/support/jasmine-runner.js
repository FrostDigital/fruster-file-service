const Jasmine = require('jasmine');
const SpecReporter = require('jasmine-spec-reporter').SpecReporter;
const noop = function () { };

const jRunner = new Jasmine({ randomizeTests: true });
jRunner.configureDefaultReporter({ print: noop }); // remove default reporter logs
jasmine.getEnv().addReporter(new SpecReporter()); // add jasmine-spec-reporter
jRunner.loadConfigFile("./spec/support/jasmine.json"); // load jasmine.json configuration
jRunner.execute();
jRunner.randomizeTests(true);
