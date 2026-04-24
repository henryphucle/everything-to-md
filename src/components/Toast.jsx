export default function Toast({ message, icon, visible }) {
  return (
    <div id="toast" className={visible ? 'visible' : ''}>
      <i id="toast-icon" className={`fa-solid ${icon} toast-icon`}></i>
      <span className="toast-msg">{message}</span>
    </div>
  );
}
