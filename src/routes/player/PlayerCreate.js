import React from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { SocketContext } from '../../context/socket';
import { generateId } from '../../util/random';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import Paper from '../../components/Paper';
import TextEditor from '../../components/TextEditor';


export const FRQ = 'frq';
export const MCQ = 'mcq'

const questionTypeValues = [FRQ, MCQ]; // mcq includes t/f questions
//const questionTypeNames = ['Free Response', 'Multiple Choice'];
// TODO extension: question type of matching and completion

const PlayerCreate = () => {
    const socket = React.useContext(SocketContext);
    const params = useParams();
    
    const [questionData, setQuestionData] = React.useState({
        type: questionTypeValues[1],
        statement: '',
        pictureURL: null, // supplementary picture diagram for question statement
        answerChoices: [], // if type is 'frq', keep empty
    });
    const [answerData, setAnswerData] = React.useState(''); // mcq: index of correct answer choice, frq: exact correct answer string
    const [tossed, setTossed] = React.useState(false);

    const tossData = () => {
        console.log('tossed data: ' + questionData.statement);
        setTossed(true);
        socket.emit('setToss', { question: questionData, answer: answerData, roomCode: params.roomCode });
    };

    React.useEffect(() => {
        socket.on('forceSetToss', tossData);

        return () => {
            socket.off('forceSetToss', tossData);
        };
    }, [socket, questionData, answerData]);

    const handleCreate = (e) => {
        e.preventDefault();
        if (e.keyCode === 13) return false; // prevent submission when pressing enter TODO: fix

        tossData();
    };

    const handleUpdateQuestion = (key, value) => {
        setQuestionData({ ...questionData, [key]: value });
        setTossed(false);
    };

    const handleAddBlankMcqChoice = React.useCallback((e) => {
        e.preventDefault();
        const id = generateId();
        const index = questionData.answerChoices.length + 1;
        setQuestionData({ ...questionData, answerChoices: [...questionData.answerChoices, { id, statement: 'Answer #' + index, correct: false }] });
        if (questionData.answerChoices.length === 1 || questionData.answerChoices.length === 0) setAnswerData('0');
    }, [questionData]);

    const handleChangeMcqAnswer = React.useCallback((id) => {
        const indexOf = questionData.answerChoices.findIndex((choice) => choice.id === id);
        // this is temporary, will be replaced by a real solution later
        questionData.answerChoices.forEach(choice => {
            choice.correct = false;
        });
        questionData.answerChoices[indexOf].correct = true;
        handleUpdateMcqChoice(id, 'correct', !questionData.answerChoices[indexOf].correct);
        setAnswerData(indexOf.toString());
    }, [questionData]);

    const handleUpdateMcqChoice = React.useCallback((id, property, value) => {
        const indexOf = questionData.answerChoices.findIndex((choice) => choice.id === id);
        const clone = questionData.answerChoices.slice();
        clone[indexOf][property] = value;
        setQuestionData({ ...questionData, answerChoices: clone });
    }, [questionData]);

    const handleRemoveMcqChoice = React.useCallback((id) => {
        const indexOf = questionData.answerChoices.findIndex((choice) => choice.id === id);
        questionData.answerChoices.splice(indexOf, 1);
        setQuestionData({ ...questionData, answerChoices: questionData.answerChoices });
    }, [questionData]);

    const paperFront = (
        <div>
            <TextEditor />
            <div className='form-section'>
                <h4 className='dark-text section-title'>Type a question here</h4>
                <label onChange={(e) => { e.preventDefault(); handleUpdateQuestion('statement', e.target.value); }}>
                    <textarea autoFocus maxLength={450}>{questionData.statement}</textarea>
                </label>
            </div>
        </div>
    );

    const paperBack = (
        <>
            <div className='form-section'>
                <div id='mcq-bar' style={questionData.type !== MCQ ? { marginBottom: 0 } : {}}>
                    <h4>Answer:</h4>
                    {questionData.type === MCQ && <button className="button" style={{ pointerEvents: 'all' }} onClick={(e) => handleAddBlankMcqChoice(e)}>Add choice</button>}
                </div>
                {questionData.type === FRQ ? (
                        <label onChange={(e) => { e.preventDefault(); setAnswerData(e.target.value) }}>
                            <Answer
                                type={questionData.type}
                                questionData={questionData}
                                handleChangeAnswer={handleChangeMcqAnswer}
                                handleUpdateChoice={handleUpdateMcqChoice}
                                handleRemoveChoice={handleRemoveMcqChoice}
                            />
                        </label>                            
                    ) : (
                    <Answer
                        type={questionData.type}
                        questionData={questionData}
                        correctAnswer={parseInt(answerData)}
                        handleChangeAnswer={handleChangeMcqAnswer}
                        handleUpdateChoice={handleUpdateMcqChoice}
                        handleRemoveChoice={handleRemoveMcqChoice}
                    />
                )}
            </div>
            <div className='form-section'>
                <input
                    disabled={questionData.answerChoices.length <= 0}
                    className='submit-button'
                    style={{ width: '6rem', height: '3rem', fontSize: '1.25rem' }}
                    type='submit'
                    value='Toss It!' 
                />
            </div>
            {tossed && <p>Tossed!</p>}
        </>        
    );

    // FOR FRQ: 
    // const formTypeBoxes = React.useCallback(() => {
    //     return questionTypeNames.slice(1).map((name, index) => { // temporarily only allow mcq
    //         const selected = index === questionTypeValues.indexOf(questionData.type); 

    //         return (
    //             <button
    //                 key={name + index.toString()}
    //                 style={selected ? { borderColor: 'white' } : {}}
    //                 onClick={(e) => {
    //                     e.preventDefault();
    //                     handleUpdateQuestion('type', questionTypeValues[index + 1])
    //                 }}
    //             >
    //                 {name}
    //             </button>
    //         );
    //     });
    // }, [questionData]);

    // const typeBoxes = formTypeBoxes();

    return (           
        <main>
            <form onSubmit={(e) => handleCreate(e)}>
                {/* FOR FRQ OPTION
                    <div className='form-section'>
                    <h4>Type:</h4>
                    {typeBoxes}
                </div> */}
                <Paper frontComponent={paperFront} backComponent={paperBack} size={800}></Paper>
            </form>                    
            {/*
            <DrawingBoard
                thickness={5} 
                color = "black" 
                style = "round" 
                onSubmit={setPicture}
            /> */}
        </main>
    );
}

const Answer = ({ type, questionData, correctAnswer, handleChangeAnswer, handleUpdateChoice, handleRemoveChoice }) => {
    switch (type) {
        case FRQ:
            return <input type='text' placeholder='To avenge their family at KFC.' value={questionData.answer}/>
        case MCQ:
            return (
                <McqForm
                    correctAnswer={correctAnswer}
                    existingAnswers={questionData.answerChoices}
                    handleChangeAnswer={handleChangeAnswer}
                    handleUpdateChoice={handleUpdateChoice}
                    handleRemoveChoice={handleRemoveChoice}
                />
            );
        default:
            return <p>Answer</p>
    }
};

Answer.propTypes = {
    type: PropTypes.oneOf(questionTypeValues).isRequired,
    questionData: PropTypes.object.isRequired,
    correctAnswer: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    handleChangeAnswer: PropTypes.func.isRequired,
    handleRemoveChoice: PropTypes.func.isRequired,
    handleUpdateChoice: PropTypes.func.isRequired,
};

const McqForm = ({ existingAnswers, correctAnswer, handleChangeAnswer, handleUpdateChoice, handleRemoveChoice }) => {
    const formChoiceBoxes = React.useCallback(() => {
        return existingAnswers.map((answer, index) => {
            return (
                <Choice
                    key={answer.id}
                    correct={index === correctAnswer}
                    id={answer.id}
                    statement={answer.statement}
                    handleChangeAnswer={handleChangeAnswer}
                    handleUpdateChoice={handleUpdateChoice}
                    handleRemoveChoice={handleRemoveChoice}
                />
            );
        });
    }, [existingAnswers, correctAnswer]);

    const choiceBoxes = formChoiceBoxes();
    
    return (
        <div>
            {choiceBoxes}
        </div>
    );
};

McqForm.propTypes = {
    existingAnswers: PropTypes.arrayOf(
        PropTypes.shape({
            statement: PropTypes.string.isRequired,
            correct: PropTypes.bool.isRequired,    
        }),
    ),
    correctAnswer: PropTypes.number.isRequired,
    handleChangeAnswer: PropTypes.func.isRequired,
    handleRemoveChoice: PropTypes.func.isRequired,
    handleUpdateChoice: PropTypes.func.isRequired,
};

const Choice = ({ correct, statement, id, handleChangeAnswer, handleUpdateChoice, handleRemoveChoice }) => {
    return (
        <div className='choice'
            style={{ borderColor: correct ? 'rgba(30, 200, 25, 1)' : undefined,
                backgroundColor: correct ? 'rgba(14, 166, 11, 0.5)' : undefined }}>
            <button
                className='circle-button-check'
                onClick={(e) => {
                    e.preventDefault();
                    handleChangeAnswer(id);
                }}
            >
                {correct && <AiOutlineCheck />}
            </button>
            <label>
                <input
                    type='text'
                    style={{ borderColor: statement.length <= 0 ? 'white' : undefined }}
                    onChange={(e) => {
                        e.preventDefault();
                        handleUpdateChoice(id, 'statement', e.target.value);
                    }}
                    value={statement}
                />
            </label>
            <button
                className='circle-button-delete'
                onClick={(e) => {
                    e.preventDefault();
                    handleRemoveChoice(id);
                }}
            >
                <AiOutlineClose />
            </button>
        </div>
    );
};

Choice.propTypes = {
    correct: PropTypes.bool.isRequired,
    statement: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    handleChangeAnswer: PropTypes.func.isRequired,
    handleRemoveChoice: PropTypes.func.isRequired,
    handleUpdateChoice: PropTypes.func.isRequired,
};

export default PlayerCreate;
