export default function FavoriteIcon({ active }) {
  return (
    <svg
      className="favorite-heart"
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-6.5-3.77-6.5-9A3.5 3.5 0 0 1 9 8a3.57 3.57 0 0 1 3 1.65A3.57 3.57 0 0 1 15 8a3.5 3.5 0 0 1 3.5 3.5c0 5.23-6.5 9-6.5 9Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
