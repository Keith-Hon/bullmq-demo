import { Worker, QueueScheduler } from "bullmq";
import { connection, TASK_QUEUE, getQueue } from "./queue";
import child_process from "child_process";
import { Queue } from "bullmq";
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';

(async () => {

    const queueScheduler = new QueueScheduler('speech-to-text', { connection });

    const worker = new Worker(
        'speech-to-text',
        async (job) => {

            console.log(job.data.video_id);
            console.log(job.data.url);
            const originalFilePath = job.data.url;
            let downloadedFilePath;

            // check file's duration
            const duration = child_process.execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${originalFilePath}`).toString();

            if (duration > 3600) {
                child_process.execSync(`ffmpeg -ss 0 -t 3600 -i ${originalFilePath} ${originalFilePath}.cut.mp3`);
                downloadedFilePath = originalFilePath + '.cut.mp3';
            } else {
                downloadedFilePath = originalFilePath;
            }

            const language = job.data.language;

            // lookup youtube-video
            const videoResponse = await axios(process.env.STRAPI_URL + '/api/youtube-videos?filters[video_id][$eq]=' + job.data.video_id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`
                }
            });

            console.log(videoResponse.data);
            if (videoResponse.data.data.length == 0) {
                console.error("video not found");
                return;
            }

            const videoData = videoResponse.data.data[0];

            // update strapi
            // lookup transcript
            const transcriptResponse = await axios(process.env.STRAPI_URL + '/api/youtube-transcripts?filters[youtube_video][$eq]=' + videoData.id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`
                },
            });

            let transcription;
            let transcriptData;

            console.log(transcriptResponse.data.data)
            if (transcriptResponse.data.data.length > 0) {
                transcription = transcriptResponse.data.data[0].attributes.text;
                transcriptData = transcriptResponse.data.data[0];
            } else {
                // check if .txt file exists
                if (fs.existsSync(downloadedFilePath + '.txt')) {
                    console.log('file exists');
                    transcription = fs.readFileSync(downloadedFilePath + '.txt', 'utf8');
                } else {

                    const formdata = new FormData();
                    formdata.append("api_key", 'sk-1ciP3pc37Hxbi66b2eqz24Uj4xe79ekhu');
                    formdata.append('data', fs.createReadStream(downloadedFilePath), {
                        filename: "audio.mp3",
                        contentType: "audio/mpeg"
                    });

                    try {
                        const { data } = await axios.post('https://paid-api.cantonese.ai', formdata, {
                            headers: formdata.getHeaders()
                        });
                        console.log(data);
                        // save as .txt
                        fs.writeFileSync(downloadedFilePath + '.txt', data.text);
                        transcription = data.text;

                    } catch (error) {
                        console.log(error);
                    }
                }

                const createTranscriptData = { data: { youtube_video: videoData.id, text: transcription, source: "speech_to_text" } }
                console.log(createTranscriptData);
                // Create Youtube Transcript
                try {
                    const createTranscriptResponse = await axios(process.env.STRAPI_URL + '/api/youtube-transcripts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`
                        },
                        data: createTranscriptData
                    });

                    transcriptData = createTranscriptResponse.data.data;
                } catch (error) {
                    console.log(error);
                    transcriptData = null;
                }
            }

            console.log("transcription done: ", transcription);

            // Create Youtube Summary
            const deepseekAPI = new OpenAI({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: "https://api.deepseek.com"
            });

            const chatResponse = await deepseekAPI.chat.completions.create({
                model: "deepseek-chat",
                messages: [{ "role": "system", "content": "You are a helpful assistant" }, { "role": "user", "content": "Tite: " + videoResponse.data.data[0].attributes.title + "\nTranscript: " + transcription + "\n\n" + "Summarize the above youtube video transcript in the original language in short." }],
                stream: false
            });

            const completion = chatResponse.choices[0].message.content;

            const createSummaryResponse = await axios(process.env.STRAPI_URL + '/api/youtube-summaries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`
                },
                data: { data: { youtube_video: videoData.id, youtube_transcript: transcriptData.id, language, summary: completion } },
            });


        },
        { autorun: true, connection, concurrency: 1 }
    );

    worker.on("closed", () => {
        console.log("worker closed");
    });

    function exitHandler(options, exitCode) {
        (async () => {
            console.log("closing worker...");
            await worker.close();
            await queueScheduler.close();

            if (options.cleanup) console.log("clean");
            if (exitCode || exitCode === 0) console.log(exitCode);
            if (options.exit) process.exit();
        })();
    }

    //do something when app is closing
    process.on("exit", exitHandler.bind(null, { cleanup: true }));

    //catches ctrl+c event
    process.on("SIGINT", exitHandler.bind(null, { exit: true }));

    // catches "kill pid" (for example: nodemon restart)
    process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
    process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

    //catches uncaught exceptions
    process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
})();

process.stdin.resume(); //so the program will not close instantly
