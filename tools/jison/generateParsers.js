// Licensed to Cloudera, Inc. under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Cloudera, Inc. licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable no-restricted-syntax */

const fs = require('fs');
const exec = require('child_process').exec;

const LICENSE =
  '// Licensed to Cloudera, Inc. under one\n' +
  '// or more contributor license agreements.  See the NOTICE file\n' +
  '// distributed with this work for additional information\n' +
  '// regarding copyright ownership.  Cloudera, Inc. licenses this file\n' +
  '// to you under the Apache License, Version 2.0 (the\n' +
  '// "License"); you may not use this file except in compliance\n' +
  '// with the License.  You may obtain a copy of the License at\n' +
  '//\n' +
  '//     http://www.apache.org/licenses/LICENSE-2.0\n' +
  '//\n' +
  '// Unless required by applicable law or agreed to in writing, software\n' +
  '// distributed under the License is distributed on an "AS IS" BASIS,\n' +
  '// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n' +
  '// See the License for the specific language governing permissions and\n' +
  '// limitations under the License.\n';

const SQL_STATEMENTS_PARSER_JSDOC =
  '/**\n' +
  ' * @param {string} input\n' +
  ' *\n' +
  ' * @return {SqlStatementsParserResult}\n' +
  ' */\n';

const PARSER_FOLDER = 'desktop/core/src/desktop/js/parse/sql/';
const JISON_FOLDER = 'desktop/core/src/desktop/js/parse/jison/';
const SQL_PARSER_REPOSITORY_PATH = 'desktop/core/src/desktop/js/parse/sql/sqlParserRepository.js';
const SYNTAX_PARSER_IMPORT_TEMPLATE =
  '  KEY: () => import(/* webpackChunkName: "KEY-parser" */ \'parse/sql/KEY/KEYSyntaxParser\')';
const AUTOCOMPLETE_PARSER_IMPORT_TEMPLATE =
  '  KEY: () => import(/* webpackChunkName: "KEY-parser" */ \'parse/sql/KEY/KEYAutocompleteParser\')';

const parserDefinitions = {
  globalSearchParser: {
    sources: ['globalSearchParser.jison'],
    target: 'globalSearchParser.jison',
    outputFolder: 'desktop/core/src/desktop/js/parse/',
    afterParse: contents =>
      new Promise(resolve => {
        resolve(
          LICENSE +
            contents.replace(
              'var globalSearchParser = ',
              "import SqlParseSupport from 'parse/sqlParseSupport';\n\nvar globalSearchParser = "
            ) +
            '\nexport default globalSearchParser;\n'
        );
      })
  },
  solrFormulaParser: {
    sources: ['solrFormulaParser.jison'],
    target: 'solrFormulaParser.jison',
    outputFolder: 'desktop/core/src/desktop/js/parse/',
    afterParse: contents =>
      new Promise(resolve => {
        resolve(LICENSE + contents + 'export default solrFormulaParser;\n');
      })
  },
  solrQueryParser: {
    sources: ['solrQueryParser.jison'],
    target: 'solrQueryParser.jison',
    outputFolder: 'desktop/core/src/desktop/js/parse/',
    afterParse: contents =>
      new Promise(resolve => {
        resolve(LICENSE + contents + 'export default solrQueryParser;\n');
      })
  },
  sqlStatementsParser: {
    sources: ['sqlStatementsParser.jison'],
    target: 'sqlStatementsParser.jison',
    outputFolder: 'desktop/core/src/desktop/js/parse/',
    afterParse: contents =>
      new Promise(resolve => {
        resolve(
          LICENSE +
            contents.replace(
              'parse: function parse',
              SQL_STATEMENTS_PARSER_JSDOC + 'parse: function parse'
            ) +
            'export default sqlStatementsParser;\n'
        );
      })
  }
};

const mkdir = path =>
  new Promise((resolve, reject) => {
    if (fs.existsSync(path)) {
      resolve();
    } else {
      fs.mkdir(path, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    }
  });

const readFile = path =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, buf) => {
      if (err) {
        reject(err);
      }
      resolve(buf ? buf.toString() : '');
    });
  });

const writeFile = (path, contents) =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, contents, err => {
      if (err) {
        reject();
      }
      resolve();
    });
  });

const copyFile = (source, destination, contentsCallback) =>
  new Promise((resolve, reject) => {
    readFile(source)
      .then(contents => {
        writeFile(destination, contentsCallback ? contentsCallback(contents) : contents)
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });

const deleteFile = path => {
  fs.unlinkSync(path);
};

const execCmd = cmd =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject('stderr:\n' + stderr + '\n\nstdout:\n' + stdout);
      }
      resolve(stdout);
    });
  });

const generateParser = parserName =>
  new Promise((resolve, reject) => {
    const parserConfig = parserDefinitions[parserName];

    const concatPromise = new Promise((resolve, reject) => {
      if (parserConfig.sources.length > 1 && parserConfig.target) {
        console.log('Concatenating files...');
        const promises = parserConfig.sources.map(fileName => readFile(JISON_FOLDER + fileName));

        Promise.all(promises)
          .then(contents => {
            writeFile(JISON_FOLDER + parserConfig.target, contents.join('')).then(() => {
              resolve(JISON_FOLDER + parserConfig.target);
            });
          })
          .catch(reject);
      } else if (parserConfig.sources.length === 1) {
        resolve(JISON_FOLDER + parserConfig.sources[0]);
      } else {
        reject('No jison source specified');
      }
    });

    concatPromise
      .then(targetPath => {
        let jisonCommand = 'jison ' + targetPath;
        if (parserConfig.lexer) {
          jisonCommand += ' ' + JISON_FOLDER + parserConfig.lexer;
        }
        jisonCommand += ' -m js';
        console.log('Generating parser...');
        execCmd(jisonCommand)
          .then(stdout => {
            if (/\S/.test(stdout)) {
              console.log('got output for: ' + jisonCommand);
              console.log(stdout);
            }
            if (parserConfig.sources.length > 1) {
              deleteFile(targetPath); // Remove concatenated file
            }
            console.log('Adjusting JS...');
            const generatedJsFileName = parserConfig.target
              .replace('.jison', '.js')
              .replace(/^.*\/([^/]+)$/, '$1');
            readFile(generatedJsFileName)
              .then(contents => {
                parserConfig
                  .afterParse(contents)
                  .then(finalContents => {
                    writeFile(parserConfig.outputFolder + generatedJsFileName, finalContents)
                      .then(() => {
                        deleteFile(generatedJsFileName);
                        resolve();
                      })
                      .catch(reject);
                  })
                  .catch(reject);
              })
              .catch(reject);
          })
          .catch(reject);
      })
      .catch(reject);
  });

let parsersToGenerate = [];
const invalid = [];

let all = false;

const listDir = folder =>
  new Promise(resolve => {
    fs.readdir(folder, (err, files) => {
      resolve(files);
    });
  });

const findParser = (fileIndex, folder, sharedFiles, autocomplete) => {
  const prefix = autocomplete ? 'autocomplete' : 'syntax';
  if (fileIndex[prefix + '_header.jison'] && fileIndex[prefix + '_footer.jison']) {
    const parserName = folder + (autocomplete ? 'AutocompleteParser' : 'SyntaxParser');
    const parserDefinition = {
      sources: ['sql/' + folder + '/' + prefix + '_header.jison'].concat(sharedFiles),
      lexer: 'sql/' + folder + '/sql.jisonlex',
      target: 'sql/' + folder + '/' + parserName + '.jison',
      sqlParser: autocomplete ? 'AUTOCOMPLETE' : 'SYNTAX',
      outputFolder: 'desktop/core/src/desktop/js/parse/sql/' + folder + '/',
      afterParse: contents =>
        new Promise(resolve => {
          resolve(
            LICENSE +
              contents
                .replace(
                  'var ' + parserName + ' = ',
                  "import SqlParseSupport from 'parse/sql/" +
                    folder +
                    "/sqlParseSupport';\n\nvar " +
                    parserName +
                    ' = '
                )
                .replace(
                  'loc: yyloc,',
                  "loc: lexer.yylloc, ruleId: stack.slice(stack.length - 2, stack.length).join(''),"
                ) +
              '\nexport default ' +
              parserName +
              ';\n'
          );
        })
    };

    parserDefinition.sources.push('sql/' + folder + '/' + prefix + '_footer.jison');
    parserDefinitions[parserName] = parserDefinition;
  } else {
    console.log(
      "Warn: Could not find '" +
        prefix +
        "_header.jison' or '" +
        prefix +
        "_footer.jison' in " +
        JISON_FOLDER +
        'sql/' +
        folder +
        '/'
    );
  }
};

const identifySqlParsers = () =>
  new Promise(resolve => {
    listDir(JISON_FOLDER + 'sql').then(files => {
      const promises = [];
      files.forEach(folder => {
        promises.push(
          listDir(JISON_FOLDER + 'sql/' + folder).then(jisonFiles => {
            const fileIndex = {};
            jisonFiles.forEach(jisonFile => {
              fileIndex[jisonFile] = true;
            });

            const sharedFiles = jisonFiles
              .filter(jisonFile => jisonFile.indexOf('sql_') !== -1)
              .map(jisonFile => 'sql/' + folder + '/' + jisonFile);

            if (fileIndex['sql.jisonlex']) {
              findParser(fileIndex, folder, sharedFiles, true);
              findParser(
                fileIndex,
                folder,
                sharedFiles.filter(path => path.indexOf('_error.jison') === -1),
                false
              );
            } else {
              console.log(
                "Warn: Could not find 'sql.jisonlex' in " + JISON_FOLDER + 'sql/' + folder + '/'
              );
            }
          })
        );
      });
      Promise.all(promises).then(resolve);
    });
  });

const copySpecs = (source, target) =>
  new Promise((resolve, reject) => {
    const replaceRegexp = new RegExp(source + '(Autocomplete|Syntax)Parser', 'g');
    mkdir(PARSER_FOLDER + target)
      .then(() => {
        mkdir(PARSER_FOLDER + target + '/spec')
          .then(() => {
            listDir(PARSER_FOLDER + source + '/spec')
              .then(specFiles => {
                const copyPromises = [];
                specFiles.forEach(specFile => {
                  copyPromises.push(
                    copyFile(
                      PARSER_FOLDER + source + '/spec/' + specFile,
                      PARSER_FOLDER + target + '/spec/' + specFile.replace(source, target),
                      contents => contents.replace(replaceRegexp, target + '$1Parser')
                    )
                  );
                });
                Promise.all(copyPromises)
                  .then(resolve)
                  .catch(reject);
              })
              .catch(reject);
          })
          .catch(reject);
      })
      .catch(reject);
  });

const prepareForNewParser = () =>
  new Promise((resolve, reject) => {
    if (process.argv.length === 3 && process.argv[0] === '-new') {
      process.argv.shift();
      const source = process.argv.shift();
      const target = process.argv.shift();
      console.log("Generating new parser '" + target + "' based on '" + source + "'...");
      process.argv.push(target);

      if (
        !Object.keys(parserDefinitions).some(key => {
          if (key.indexOf(source) === 0) {
            copySpecs(source, target)
              .then(() => {
                mkdir(JISON_FOLDER + 'sql/' + target)
                  .then(() => {
                    listDir(JISON_FOLDER + 'sql/' + source).then(files => {
                      const copyPromises = [];
                      files.forEach(file => {
                        copyPromises.push(
                          copyFile(
                            JISON_FOLDER + 'sql/' + source + '/' + file,
                            JISON_FOLDER + 'sql/' + target + '/' + file
                          )
                        );
                      });
                      Promise.all(copyPromises).then(() => {
                        const autocompleteSources = [
                          'sql/' + target + '/autocomplete_header.jison'
                        ];
                        const syntaxSources = ['sql/' + target + '/syntax_header.jison'];

                        files.forEach(file => {
                          if (file.indexOf('sql_') === 0) {
                            autocompleteSources.push('sql/' + target + '/' + file);
                            syntaxSources.push('sql/' + target + '/' + file);
                          }
                        });
                        autocompleteSources.push('sql/' + target + '/autocomplete_footer.jison');
                        syntaxSources.push('sql/' + target + '/syntax_footer.jison');
                        mkdir('desktop/core/src/desktop/js/parse/sql/' + target).then(() => {
                          copyFile(
                            'desktop/core/src/desktop/js/parse/sql/' +
                              source +
                              '/sqlParseSupport.js',
                            'desktop/core/src/desktop/js/parse/sql/' +
                              target +
                              '/sqlParseSupport.js',
                            contents =>
                              contents.replace(
                                /parser\.yy\.activeDialect = '[^']+';'/g,
                                "parser.yy.activeDialect = '" + target + "';"
                              )
                          ).then(() => {
                            identifySqlParsers()
                              .then(resolve)
                              .catch(reject);
                          });
                        });
                      });
                    });
                  })
                  .catch(err => {
                    console.log(err);
                  });
              })
              .catch(reject);
            return true;
          }
        })
      ) {
        reject("No existing parser found for '" + source + "'");
      }
    } else {
      resolve();
    }
  });

identifySqlParsers().then(() => {
  process.argv.shift();
  process.argv.shift();
  prepareForNewParser().then(() => {
    process.argv.forEach(arg => {
      if (arg === 'all') {
        all = true;
      } else if (parserDefinitions[arg]) {
        parsersToGenerate.push(arg);
      } else {
        let prefixFound = false;
        Object.keys(parserDefinitions).forEach(key => {
          if (key.indexOf(arg) === 0) {
            prefixFound = true;
            parsersToGenerate.push(key);
          }
        });
        if (!prefixFound) {
          invalid.push(arg);
        }
      }
    });

    if (all) {
      parsersToGenerate = Object.keys(parserDefinitions);
    }

    if (invalid.length) {
      console.log("No parser config found for: '" + invalid.join("', '") + "'");
      console.log(
        '\nPossible options are:\n  ' +
          ['all'].concat(Object.keys(parserDefinitions)).join('\n  ') +
          '\n'
      );
      return;
    }

    const parserCount = parsersToGenerate.length;
    let idx = 0;

    const generateRecursive = () => {
      idx++;
      if (parsersToGenerate.length) {
        const parserName = parsersToGenerate.pop();
        if (parserCount > 1) {
          console.log("Generating '" + parserName + "' (" + idx + '/' + parserCount + ')...');
        } else {
          console.log("Generating '" + parserName + "'...");
        }
        generateParser(parserName)
          .then(generateRecursive)
          .catch(error => {
            console.log(error);
            console.log('FAIL!');
          });
      } else {
        const autocompParsers = [];
        const syntaxParsers = [];
        console.log('Updating sqlParserRepository.js...');
        Object.keys(parserDefinitions).forEach(key => {
          if (parserDefinitions[key].sqlParser === 'AUTOCOMPLETE') {
            autocompParsers.push(
              AUTOCOMPLETE_PARSER_IMPORT_TEMPLATE.replace(
                /KEY/g,
                key.replace('AutocompleteParser', '')
              )
            );
          } else if (parserDefinitions[key].sqlParser === 'SYNTAX') {
            syntaxParsers.push(
              SYNTAX_PARSER_IMPORT_TEMPLATE.replace(/KEY/g, key.replace('SyntaxParser', ''))
            );
          }
        });
        readFile(SQL_PARSER_REPOSITORY_PATH).then(contents => {
          contents = contents.replace(
            /const SYNTAX_MODULES = [^}]+}/,
            'const SYNTAX_MODULES = {\n' + syntaxParsers.sort().join(',\n') + '\n}'
          );
          contents = contents.replace(
            /const AUTOCOMPLETE_MODULES = [^}]+}/,
            'const AUTOCOMPLETE_MODULES = {\n' + autocompParsers.sort().join(',\n') + '\n}'
          );
          writeFile(SQL_PARSER_REPOSITORY_PATH, contents).then(() => {
            console.log('Done!\n');
          });
        });
      }
    };
    generateRecursive();
  });
});

/* eslint-enable no-restricted-syntax */
