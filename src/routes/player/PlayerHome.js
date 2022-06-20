import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../../context/socket';
import '../../styles/player/PlayerHome.scss';
import PlayerCreate from './PlayerCreate';
import PlayerRespond from './PlayerRespond';
import PlayerResults from './PlayerResults';
import PlayerReturn from './PlayerReturn';
import { FRQ } from './PlayerCreate';

const PlayerHome = () => {
    const socket = React.useContext(SocketContext);
    const params = useParams();
    const navigate = useNavigate();
    React.useEffect(() => {
        socket.emit('checkEnterPlayerHome', params.roomCode);
        socket.on('checkFail', ({ message }) => {
            console.log('ERROR ACCESSING PLAYER HOME: ' + message);
            navigate('/');
            return;
        });
    }, []);

    const [status, setStatus] = React.useState('create');
    
    // respond
    const [receivedQuestion, setReceivedQuestion] = React.useState({});
    const [response, setResponse] = React.useState('');

    // results
    const [isCorrect, setIsCorrect] = React.useState(null);
    const [correctAnswer, setCorrectAnswer] = React.useState('');

    // return
    const [returnedResponses, setReturnedResponses] = React.useState([]);

    React.useEffect(() => {
        socket.on('tossQuestion', questionObject => {
            setReceivedQuestion(questionObject);
            setStatus('respond');
        });

        socket.on('returnToss', responses => {
            setReturnedResponses(responses);
            setStatus('return');
        });

        // todo: unmount, add socket to below []
    }, []);

    const handleRespond = (e) => {
        e.preventDefault();
        if (e.keyCode === 13) return false;

        socket.emit('respondToss', { response, roomCode: params.roomCode } );
        socket.once('tossAnswer', ({ isCorrect, answer }) => { // memory leak TODO
            setIsCorrect(isCorrect);
            const answerAsInt = parseInt(answer);
            receivedQuestion.type === FRQ ? setCorrectAnswer(answer) : setCorrectAnswer({...receivedQuestion.answerChoices[answer], index: answerAsInt});
            setStatus('result');
        });
    }
    
    switch(status) {
        case 'create':
            return <PlayerCreate />;
        case 'respond':
            return <PlayerRespond
                questionData={receivedQuestion}
                response={response}
                setResponse={setResponse}
                handleRespond={handleRespond}
            />;
        case 'result':
            return <PlayerResults
                showCorrect={receivedQuestion.type !== 'frq'}
                questionData={receivedQuestion}
                response={response}
                isCorrect={isCorrect}
                correctAnswer={correctAnswer}
            />;
        case 'return':
            return <PlayerReturn
                returnedResponses={returnedResponses}
            />;
        default: return null;
    }
}

export default PlayerHome;