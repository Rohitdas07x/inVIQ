import React from 'react';
import AIAssistantInterface from '../../components/ui/ai-assistant-interface';

const ManagerChatbot = () => {
    return (
        <div className="w-full h-[calc(100vh-6rem)] bg-white overflow-hidden">
            <AIAssistantInterface isPreview={false} />
        </div>
    );
};

export default ManagerChatbot;