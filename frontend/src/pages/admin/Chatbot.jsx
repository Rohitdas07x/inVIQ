import React from 'react';
import AIAssistantInterface from '../../components/ui/ai-assistant-interface';

const Chatbot = () => {
    return (
        <div className="w-full h-full flex-1 bg-white overflow-hidden">
            <AIAssistantInterface isPreview={false} />
        </div>
    );
};


export default Chatbot;
