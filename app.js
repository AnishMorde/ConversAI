const chatBox = document.getElementById('chat-box');
const sendButton = document.getElementById('send-button');
const pdfInput = document.getElementById('pdf-file');
const userInput = document.getElementById('user-input');
const uploadArea = document.getElementById('upload-area');
const pdfNameDisplay = document.getElementById('pdf-name');
let pdfText = '';


function appendMessage(sender, message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user' : 'ConversAI');

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.innerHTML = message;

    messageElement.appendChild(contentElement);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; 

   
    setTimeout(() => {
        contentElement.classList.add('show');
    }, 100);
}


function showThinkingIndicator() {
    appendMessage('Bot', '...', false);
    const lastMessage = chatBox.lastChild;
    lastMessage.classList.add('thinking');
    return lastMessage;
}


function hideThinkingIndicator(lastMessage) {
    lastMessage.classList.remove('thinking');
    lastMessage.innerHTML = 'ConversAI is typing...'; 
}

// Handle PDF Upload
pdfInput.addEventListener('change', async () => {
    const file = pdfInput.files[0];
    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function (e) {
            const typedArray = new Uint8Array(e.target.result);

            // Use PDF.js to extract text from the PDF
            const loadingTask = pdfjsLib.getDocument(typedArray);
            loadingTask.promise.then(pdf => {
                let textPromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    textPromises.push(pdf.getPage(i).then(page => page.getTextContent()));
                }

                // When all pages' text is extracted
                Promise.all(textPromises).then(pagesText => {
                    pdfText = pagesText.map(page => page.items.map(item => item.str).join(' ')).join('\n');
                    pdfNameDisplay.textContent = `Uploaded PDF: ${file.name}`;
                    appendMessage('System', 'PDF uploaded and text extracted successfully! You can now chat.');
                }).catch(error => {
                    console.error('Error extracting PDF text:', error);
                    appendMessage('System', 'Error extracting PDF text. Please try again.');
                });
            }).catch(reason => {
                console.error('Error loading PDF:', reason);
                appendMessage('System', 'Error loading PDF. Please try again.');
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});

// Handle Send Button click
sendButton.addEventListener('click', () => {
    const query = userInput.value.trim();
    if (query) {
        appendMessage('You', query, true);
        userInput.value = '';

        // Call OpenAI API and update bot response
        const thinkingIndicator = showThinkingIndicator(); 
        getChatResponse(query, thinkingIndicator);
    } else {
        alert('Please enter a question.');
    }
});

// OpenAI API Call
function getChatResponse(query, thinkingIndicator) {
    const openAiApiKey = 'OPENAI_API_KEY'; // Your old OpenAI key here
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const data = {
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: `The following is text from a PDF:\n\n${pdfText}` },
            { role: 'user', content: query }
        ],
        max_tokens: 150,
        temperature: 0.5
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        hideThinkingIndicator(thinkingIndicator); 
        const botMessage = data.choices[0].message.content.trim();
        appendMessage('Bot', botMessage);
    })
    .catch(error => {
        console.error('Error:', error);
        hideThinkingIndicator(thinkingIndicator); 
        appendMessage('Bot', 'Sorry, there was an error processing your request.');
    });
}
