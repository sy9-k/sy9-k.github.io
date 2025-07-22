function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
const cityId = getQueryParam('id');
const city = window.cityData[cityId];
if (city) {
  document.getElementById('city-title').textContent = city.name + ' - 世界の都市紹介';
  document.getElementById('city-name').textContent = city.name;
  document.getElementById('city-img').src = city.img;
  document.getElementById('city-img').alt = city.name + 'のイメージ';
  document.getElementById('city-desc').textContent = city.desc;
  // 人気スポット
  const spots = city.spots || [];
  const spotsDiv = document.getElementById('city-spots');
  spotsDiv.innerHTML = '';
  spots.forEach(spot => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.background = '#f5f5f5';
    row.style.borderRadius = '10px';
    row.style.marginBottom = '18px';
    row.style.boxShadow = '0 2px 8px #0001';
    row.style.overflow = 'hidden';
    const img = document.createElement('img');
    img.src = spot.img;
    img.alt = spot.name + 'のイメージ';
    img.style.width = '240px';
    img.style.height = '150px';
    img.style.objectFit = 'cover';
    img.style.background = '#ddd';
    const text = document.createElement('div');
    text.style.padding = '18px 18px 18px 18px';
    text.style.flex = '1';
    const name = document.createElement('div');
    name.textContent = spot.name;
    name.style.fontSize = '1.3rem';
    name.style.fontWeight = '600';
    name.style.color = '#232323';
    name.style.marginBottom = '8px';
    const desc = document.createElement('div');
    desc.textContent = spot.desc;
    desc.style.fontSize = '1.05rem';
    desc.style.color = '#444';
    text.appendChild(name);
    text.appendChild(desc);
    row.appendChild(img);
    row.appendChild(text);
    spotsDiv.appendChild(row);
  });
  // おすすめフード（現地のソウルフード）
  const foods = city.food || [];
  const foodDiv = document.getElementById('city-food');
  foodDiv.innerHTML = '';
  foods.forEach(food => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.background = '#f5f5f5';
    row.style.borderRadius = '10px';
    row.style.marginBottom = '18px';
    row.style.boxShadow = '0 2px 8px #0001';
    row.style.overflow = 'hidden';
    row.style.width = '100%';
    const img = document.createElement('img');
    img.src = food.img;
    img.alt = food.name + 'のイメージ';
    img.style.width = '240px';
    img.style.height = '150px';
    img.style.objectFit = 'cover';
    img.style.background = '#ddd';
    const text = document.createElement('div');
    text.style.padding = '18px 18px 18px 18px';
    text.style.flex = '1';
    const name = document.createElement('div');
    name.textContent = food.name;
    name.style.fontSize = '1.15rem';
    name.style.fontWeight = '600';
    name.style.color = '#232323';
    name.style.marginBottom = '8px';
    const desc = document.createElement('div');
    desc.textContent = food.desc;
    desc.style.fontSize = '1.05rem';
    desc.style.color = '#444';
    text.appendChild(name);
    text.appendChild(desc);
    row.appendChild(img);
    row.appendChild(text);
    foodDiv.appendChild(row);
  });
} else {
  document.getElementById('city-name').textContent = '都市が見つかりません';
} 