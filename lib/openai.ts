import OpenAI from 'openai';


export const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});


export const ensureKey = () => {
if (!process.env.OPENAI_API_KEY) {
throw new Error('OPENAI_API_KEY is not set');
}
};
