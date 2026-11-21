import { COLOR_LABELS, QUESTION_TYPES } from '../utils/constants';

export default function QuestionHistory({ gameState }) {
  const history = gameState.questionHistory || [];

  if (history.length === 0) {
    return (
      <div className="question-history">
        <p className="qh-title">线索历史</p>
        <p className="qh-empty">暂无提问记录</p>
      </div>
    );
  }

  return (
    <div className="question-history">
      <p className="qh-title">线索历史 ({history.length})</p>
      <div className="qh-list">
        {history.slice().reverse().map((q, i) => {
          const asker = gameState.players.find((p) => p.id === q.askerId);
          const answerer = gameState.players.find((p) => p.id === q.answeredBy);

          let questionText = '';
          let answerText = '';

          if (q.type === QUESTION_TYPES.SORTING) {
            questionText = `数字${q.tileNumber}排第几位？`;
            if (q.answer) {
              answerText = `第${q.answer.position}位 (小${q.answer.smallerCount}/大${q.answer.biggerCount})`;
            }
          } else {
            questionText = `${COLOR_LABELS[q.color]}色与${q.tileNumber}点数相同？`;
            if (q.answer) {
              answerText = q.answer.same ? '是' : '否';
            }
          }

          return (
            <div key={q.id || i} className="qh-item">
              <div className="qh-question">
                <span className="qh-asker">{asker?.name}</span>
                <span className="qh-text">{questionText}</span>
              </div>
              {answerText && (
                <div className="qh-answer">
                  <span className="qh-answerer">{answerer?.name}</span>
                  <span className="qh-answer-text">{answerText}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
