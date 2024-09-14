const vscode = require('vscode');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Store original API secrets
let originalSecrets = {};

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    console.log('Congratulations, your extension "happier" is now active!');

    const genAI = new GoogleGenerativeAI('AIzaSyDHNslI3bMTPQ6KF4p8_c8onAerMJQiyPY');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Command registration for SQL analysis
    const disposableSQLAnalysis = vscode.commands.registerCommand('happier-coder.happycoder', async function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const codeText = document.getText();

        // Pattern to extract SQL queries from the code
        const sqlPattern = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b[\s\S]+?;/gi;
        const sqlCodeMatches = codeText.match(sqlPattern);

        if (sqlCodeMatches && sqlCodeMatches.length > 0) {
            vscode.window.showInformationMessage(`Extracted ${sqlCodeMatches.length} SQL queries for analysis.`);

            const sqlCode = sqlCodeMatches.join('\n');
            const prompt = `Analyze the following SQL queries, identify the lines that are vulnerable to SQL injection, and provide a replacement using a prepared statement with placeholders for each vulnerable line. Include line numbers and provide placeholders, but without explanations.

SQL Code:
${sqlCode}

## Output:
1. Line number of each vulnerable line.
2. Prepared statement replacement for each vulnerable line, with placeholders like '?' or ':paramName'.
3. Provide placeholder variable definitions for better integration in the code.`

            try {
                // Generate recommendations from the model
                const result = await model.generateContent(prompt);
                const recommendations = result.response.text();

                if (recommendations) {
                    vscode.window.showInformationMessage('SQL Injection vulnerability found. Check the output.');
                    console.log('Gemini Recommendations:', recommendations);

                    // Show recommendations in the Output window
                    const outputChannel = vscode.window.createOutputChannel("SQL Vulnerability Analysis");
                    outputChannel.show();
                    outputChannel.appendLine(recommendations);
                } else {
                    vscode.window.showInformationMessage('No SQL Injection vulnerabilities found.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error analyzing SQL code: ${error.message}`);
            }
        } else {
            vscode.window.showInformationMessage('No SQL queries found in the current file.');
        }
    });

    // Command registration for XSS analysis
    const disposableXSSAnalysis = vscode.commands.registerCommand('happier-coder.detectXSS', async function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const codeText = document.getText();

        // Pattern to detect unsafe use of innerHTML and event handlers
        const xssPattern = /\b(innerHTML|on\w+\s*=\s*["'][\s\S]*["'])\b/gi;
        const xssMatches = codeText.match(xssPattern);

        if (xssMatches && xssMatches.length > 0) {
            vscode.window.showInformationMessage(`Detected ${xssMatches.length} potential XSS vulnerabilities.`);

            const xssCode = xssMatches.join('\n');
            const prompt = `Analyze the following code snippets, identify the lines that are vulnerable to XSS attacks, and provide safe alternatives. Include line numbers and avoid using innerHTML directly. For event handlers, suggest safer patterns like using addEventListener.

Code Snippets:
${xssCode}

## Output:
1. Line number of each vulnerable line.
2. Safe alternative for each vulnerable line.`

            try {
                // Generate recommendations from the model
                const result = await model.generateContent(prompt);
                const recommendations = result.response.text();

                if (recommendations) {
                    vscode.window.showInformationMessage('Potential XSS vulnerabilities found. Check the output.');
                    console.log('Gemini Recommendations:', recommendations);

                    // Show recommendations in the Output window
                    const outputChannel = vscode.window.createOutputChannel("XSS Vulnerability Analysis");
                    outputChannel.show();
                    outputChannel.appendLine(recommendations);
                } else {
                    vscode.window.showInformationMessage('No XSS vulnerabilities found.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error analyzing code for XSS: ${error.message}`);
            }
        } else {
            vscode.window.showInformationMessage('No potential XSS vulnerabilities found.');
        }
    });

    const disposableCloak = vscode.commands.registerCommand('happier-coder.cloak', function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const codeText = document.getText();
        const languageId = document.languageId; // Get the language of the current document

        // Regex pattern to detect API keys (adjust according to the pattern you expect)
        const apiKeyPattern = /['"]?([A-Za-z0-9-_]{32,})['"]?/g;
        let match;
        originalSecrets = {};

        // Determine how to hide the keys based on the language
        let hidePattern = '*** HIDDEN API KEY ***';
        if (languageId === 'javascript' || languageId === 'typescript') {
            hidePattern = `'${hidePattern}'`; // Hide using single quotes
        } else if (languageId === 'python') {
            hidePattern = `# ${hidePattern}`; // Hide using comments
        } else if (languageId === 'html' || languageId === 'xml') {
            hidePattern = `<!-- ${hidePattern} -->`; // Hide using HTML comments
        } else if (languageId === 'bash' || languageId === 'sh') {
            hidePattern = `# ${hidePattern}`; // Hide using bash comments
        }

        let modifiedCode = codeText.replace(apiKeyPattern, (match, key, index) => {
            // Store the original secret
            originalSecrets[index] = match;
            return hidePattern;
        });

        // Replace the text in the editor with hidden secrets
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(codeText.length));
        editor.edit(editBuilder => {
            editBuilder.replace(fullRange, modifiedCode);
        });

        vscode.window.showInformationMessage('API keys have been hidden.');
    });

    // Reveal API secrets (same as before)
    const disposableReveal = vscode.commands.registerCommand('happier-coder.reveal', function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        const document = editor.document;
        const codeText = document.getText();

        // Replace hidden keys back with original values
        let revealedCode = codeText;
        for (const index in originalSecrets) {
            const regex = new RegExp('\\*\\*\\* HIDDEN API KEY \\*\\*\\*', 'g');
            revealedCode = revealedCode.replace(regex, originalSecrets[index]);
        }

        // Replace the text in the editor with revealed secrets
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(codeText.length));
        editor.edit(editBuilder => {
            editBuilder.replace(fullRange, revealedCode);
        });

        vscode.window.showInformationMessage('API keys have been revealed.');
    });

    context.subscriptions.push(disposableSQLAnalysis, disposableXSSAnalysis, disposableCloak, disposableReveal);
}

/**
 * Function to deactivate the extension
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};




// // Run Command happier-.happycoder
// const vscode = require('vscode');
// const { GoogleGenerativeAI } = require('@google/generative-ai');


// /**
//  * @param {vscode.ExtensionContext} context
//  */
// async function activate(context) {
//     console.log('Congratulations, your extension "happier " is now active!');


//     const genAI = new GoogleGenerativeAI('AIzaSyDHNslI3bMTPQ6KF4p8_c8onAerMJQiyPY');
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

//     // Command 
//     const disposable = vscode.commands.registerCommand('happier-coder.happycoder', async function () {
       
//         const editor = vscode.window.activeTextEditor;

//         if (!editor) {
//             vscode.window.showInformationMessage('No editor is active');
//             return;
//         }

//         const document = editor.document;
//         const codeText = document.getText();

//         // pattern to extract SQL queries from the code
//         const sqlPattern = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b[\s\S]+?;/gi;
//         const sqlCodeMatches = codeText.match(sqlPattern);

//         if (sqlCodeMatches && sqlCodeMatches.length > 0) {
//             vscode.window.showInformationMessage(`Extracted ${sqlCodeMatches.length} SQL queries for analysis.`);

          
//             const sqlCode = sqlCodeMatches.join('\n');
// 			const prompt = `Analyze the following SQL queries, identify the lines that are vulnerable to SQL injection,and provide a replacement using a prepared statement for each vulnerable line. Include the line numbers but no explanations.

// SQL Code:
// ${sqlCode}

// ## Output:
// 1. Line number of each vulnerable line.
// 2. Prepared statement replacement for each vulnerable line, with placeholders for parameters.
// 3. Placeholder variable code for better integration.`;


//             try {
              
//                 const result = await model.generateContent(prompt);
//                 const recommendations = result.response.text();

               
//                 if (recommendations) {
//                     vscode.window.showInformationMessage('SQL Injection vulnerability found. Check the output.');
//                     console.log('Gemini Recommendations:', recommendations);

//                     // Show recommendations 
//                     const outputChannel = vscode.window.createOutputChannel("SQL Vulnerability Analysis");
//                     outputChannel.show();
//                     outputChannel.appendLine(recommendations);
//                 } else {
//                     vscode.window.showInformationMessage('No SQL Injection vulnerabilities found.');
//                 }
//             } catch (error) {
//                 vscode.window.showErrorMessage(`Error analyzing SQL code: ${error.message}`);
//             }
//         } else {
//             vscode.window.showInformationMessage('No SQL queries found in the current file.');
//         }
//     });

//     context.subscriptions.push(disposable);
// }

// /**
//  * Function to deactivate the extension
//  */
// function deactivate() {}

// module.exports = {
//     activate,
//     deactivate
// };

