// Drill library filters: by skill and by grade. Without JavaScript every drill shows.
(() => {
  const list = [...document.querySelectorAll('.drill')];
  const buttons = [...document.querySelectorAll('.skill-buttons button')];
  const grade = document.getElementById('drill-grade');
  const count = document.querySelector('.drill-count');
  let skill = 'All';
  function apply() {
    const g = Number(grade.value);
    let shown = 0;
    list.forEach(li => {
      const okSkill = skill === 'All' || li.dataset.skills.split('|').includes(skill);
      const okGrade = !g || Number(li.dataset.minGrade) <= g;
      li.hidden = !(okSkill && okGrade);
      if (!li.hidden) shown++;
    });
    count.textContent = `${shown} of ${list.length} drills`;
  }
  buttons.forEach(b => b.addEventListener('click', () => {
    skill = b.dataset.skill;
    buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  grade.addEventListener('change', apply);
  apply();
})();
