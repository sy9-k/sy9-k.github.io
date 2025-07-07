document.getElementById('start-screen').addEventListener('click', () => {
  goTo('language-screen');
});

function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}
