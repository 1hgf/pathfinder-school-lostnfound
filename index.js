const snap_container = document.querySelector('.snap_container');
const savedScrollTop = window.sessionStorage.getItem('scrollTop');
if (savedScrollTop) {
    snap_container.scrollTo({top: savedScrollTop, behavior: "instant"});
}
let lastScrollTop = 0;
setInterval(() => {
    const scrollTop = snap_container.scrollTop;
    if (scrollTop !== lastScrollTop) {
        lastScrollTop = scrollTop;
        // 滚动位置改变时执行的操作
        window.sessionStorage.setItem('scrollTop', scrollTop);
    }
}, 200);
let snowflakes = [];
// 处理用户登录状态显示
function renderUserInfo() {
    const userInfoContainer = document.getElementById('userInfoContainer');
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // 已登录状态
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const username = userInfo.username || '用户';
            const avatarText = username.charAt(0);
            userInfoContainer.innerHTML = `
                <div class="avatar">${avatarText}</div>
                <span>${username}</span>
            `;
            userInfoContainer.onclick = function() {
                window.location.href = './个人中心.html';
            };
        } catch (e) {
            // 处理用户信息解析错误
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            renderUserInfo(); // 重新渲染登录状态
        }
    } else {
        // 未登录状态
        userInfoContainer.innerHTML = `
            <button class="login-btn">登录/注册</button>
        `;
        userInfoContainer.onclick = function() {
            window.location.href = './login.html';
        };
    }
}
// 在页面加载时渲染用户信息
document.addEventListener('DOMContentLoaded', renderUserInfo);
// 初始化hero区域的canvas
const heroCanvas = document.getElementById('heroCanvas');
if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    snowflakes = [];
    let isSnowing = false;
    let hoverTimer = null;
    const hoverDelay = 1000; // 1秒后触发雪花效果
    // 引力模拟参数
    const G = 0.3;              // 引力常数
    const minDist = 30;          // 最近作用距离（防止距离过近导致加速度过大）
    const maxAccel = 0.8;       // 加速度上界
    const minAccel = 0.001;     // 加速度下界
    const maxSpeed = 20;         // 速度上界
    const mouseMass = 4000;       // 鼠标引力源质量
    // 鼠标跟踪
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseOnCanvas = false;
    // 设置canvas尺寸为窗口大小
    function resizeCanvas() {
        heroCanvas.width = window.innerWidth;
        heroCanvas.height = window.innerHeight;
        // 重新绘制文字
        drawText();
    }
    // 绘制标题文字
    function drawText() {
        ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
        // 设置文字样式
        ctx.font = 'bold 80px "art"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 创建渐变
        const gradient = ctx.createLinearGradient(
            heroCanvas.width / 2 - 200, 
            heroCanvas.height / 2, 
            heroCanvas.width / 2 + 200, 
            heroCanvas.height / 2
        );
        gradient.direction = '135deg';
        gradient.addColorStop(0, '#237ff7');
        gradient.addColorStop(1, '#0d47a1');
        ctx.fillStyle = gradient;
        // 绘制文字
        const text = '校园寻路与失物招领系统';
        ctx.fillText(text, heroCanvas.width / 2, heroCanvas.height / 2);
    }
    // 创建雪花粒子
    function createSnowflakes() {
        const imageData = ctx.getImageData(0, 0, heroCanvas.width, heroCanvas.height);
        const pixels = imageData.data;
        snowflakes = [];
        // 每隔一定像素采样一个点作为雪花
        const sampleRate = 7;
        for (let y = 0; y < heroCanvas.height; y += sampleRate) {
            for (let x = 0; x < heroCanvas.width; x += sampleRate) {
                const index = (y * heroCanvas.width + x) * 4;
                const alpha = pixels[index + 3];
                // 如果该像素有颜色（透明度不为0）
                if (alpha > 100) {
                    const r = pixels[index];
                    const g = pixels[index + 1];
                    const b = pixels[index + 2];
                    snowflakes.push({
                        x: x,
                        y: y,
                        size: Math.random() * 8 + 0.5,
                        speedX: Math.random() * 2.5 + 0.7, // 左右浮动
                        speedY: Math.random() * 2.5 + 0.7, // 向下飘落
                        color: `rgb(${r}, ${g}, ${b})`,
                        opacity: alpha / 255
                    });
                }
            }
        }
        // 清除画布
        ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
        isSnowing = true;
        animateSnowflakes();
    }
    // 雪花动画
    function animateSnowflakes() {
        if (!isSnowing) return;
        ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
        const n = snowflakes.length;
        // 第一遍：计算引力加速度
        for (let i = 0; i < n; i++) {
            let ax = 0, ay = 0;
            const flake = snowflakes[i];
            // 雪花间相互引力
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const other = snowflakes[j];
                const dx = other.x - flake.x;
                const dy = other.y - flake.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) continue;
                // 加速度 ∝ 对方大小 / (距离² × 自身大小)
                let accelMag = G * other.size / (dist * dist * flake.size);
                accelMag = Math.max(minAccel, Math.min(maxAccel, accelMag));
                ax += accelMag * (dx / dist);
                ay += accelMag * (dy / dist);
            }
            // 鼠标引力源
            if (mouseOnCanvas) {
                const dx = mouseX - flake.x;
                const dy = mouseY - flake.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= minDist) {
                    let accelMag = G * mouseMass / (dist * dist * flake.size);
                    accelMag = Math.max(minAccel, Math.min(maxAccel, accelMag));
                    ax += accelMag * (dx / dist);
                    ay += accelMag * (dy / dist);
                }
            }
            // 应用加速度到速度
            flake.speedX += ax;
            flake.speedY += ay;
        }
        // 第二遍：更新位置并绘制
        snowflakes.forEach((flake) => {
            // 速度上界限制
            flake.speedX = Math.max(-maxSpeed, Math.min(maxSpeed, flake.speedX));
            flake.speedY = Math.max(-maxSpeed, Math.min(maxSpeed, flake.speedY));
            // 更新雪花位置
            flake.x += flake.speedX;
            flake.y += flake.speedY;
            // 绘制雪花
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            ctx.fillStyle = flake.color;
            ctx.globalAlpha = flake.opacity;
            ctx.fill();
            // 当雪花落到画布外时，从顶部重新开始
            if (flake.y > heroCanvas.height) {
                flake.y = 0;
                if(flake.size < 0.25) {
                    flake.color = 'rgba(0, 0, 0, 0.0)';
                } else
                    flake.size /= 1.1;
            }
            else if(flake.y < 0) {
                flake.y = heroCanvas.height;
            }
            if (flake.x < 0) {
                flake.x = heroCanvas.width;
            } else if (flake.x > heroCanvas.width) {
                flake.x = 0;
            }
        });
        requestAnimationFrame(animateSnowflakes);
    }
    // 监听鼠标悬停
    heroCanvas.addEventListener('mousemove', (e) => {
        // 检查鼠标是否在标题区域
        const rect = heroCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // 更新鼠标位置（用于引力模拟）
        mouseX = x;
        mouseY = y;
        // 标题文字大致区域
        const textWidth = ctx.measureText('校园寻路与失物招领系统').width; // 估算的文字宽度
        const textHeight = 100; // 估算的文字高度
        const textX = heroCanvas.width / 2 - textWidth / 2;
        const textY = heroCanvas.height / 2 - textHeight / 2;
        const isOverTitle = x > textX && x < textX + textWidth && y > textY && y < textY + textHeight;
        if (isOverTitle && !isSnowing) {
            // 鼠标在标题上，启动计时器
            if (!hoverTimer) {
                hoverTimer = setTimeout(() => {
                    createSnowflakes();
                }, hoverDelay);
            }
        } else {
            // 鼠标不在标题上，清除计时器
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
        }
    });
    // 鼠标进入/离开canvas
    heroCanvas.addEventListener('mouseenter', () => {
        mouseOnCanvas = true;
    });
    heroCanvas.addEventListener('mouseleave', () => {
        mouseOnCanvas = false;
    });
    // 初始设置尺寸
    resizeCanvas();
    // 监听窗口大小变化
    window.addEventListener('resize', resizeCanvas);
}
// 失物招领数据数组
let lostFoundData = [];

// 渲染轮播卡片
function renderCarouselCards() {
    const track = document.getElementById('carouselTrack');
    const dotsContainer = document.getElementById('carouselDots');
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    lostFoundData.forEach((item, index) => {
        const isLost = item.type === 'lost';
        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.innerHTML = `
            <div class="card-top-bar ${isLost ? 'bar-lost' : 'bar-found'}"></div>
            <div class="card-body">
                <div class="card-header">
                    <span class="card-badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? '🔴 丢失' : '🟢 捡到'}</span>
                    <span class="card-location">📍 ${item.location}</span>
                </div>
                <div class="card-item-name">${item.item}</div>
                <div class="card-desc">${item.desc}</div>
                <div class="card-footer">
                    <span class="card-date">📅 ${item.date}</span>
                    <span class="card-contact">${item.contact} →</span>
                </div>
            </div>
        `;
        card.addEventListener('click', function() {
            window.location.href = './失物招领列表.html?id=' + item.id;
        });
        track.appendChild(card);

        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', function() { goToSlide(index); });
        dotsContainer.appendChild(dot);
    });
}

// 轮播控制逻辑
let currentSlide = 0;
// 减少同时显示的卡片数量以增强3D效果
let slidesPerView = 3;
let autoPlayTimer = null;
const autoPlayInterval = 6000; // 延长自动播放间隔
// 3D效果参数
const cardAngle = 45; // 两侧卡片的旋转角度
const cardScale = 0.8; // 两侧卡片的缩放比例
const cardZ = 130; // 卡片Z轴距离

function getSlidesPerView() {
    const w = window.innerWidth;
    if (w <= 768) return 1;
    if (w <= 1024) return 2;
    return 3; // 始终显示3张卡片以保持3D效果
}

function getMaxSlide() {
    return Math.max(0, lostFoundData.length - 1);
}

function updateCarousel() {
    const track = document.getElementById('carouselTrack');
    let cards = track.querySelectorAll('.carousel-card');
    const cardWidth = cards[0]?.offsetWidth || 280;
    const totalWidth = track.offsetWidth;
    
    // 重置所有卡片样式
    cards.forEach((card, index) => {
        // 计算当前卡片与活动卡片的距离
        const distance = Math.abs(index - currentSlide);
        
        // 只显示当前卡片附近的几张卡片
        if (distance > slidesPerView) {
            card.style.display = 'none';
            return;
        } else {
            card.style.display = 'flex';
        }
        
        // 计算3D变换参数
        let rotateY = 0;
        let scale = 1;
        let zIndex = -(Math.abs(slidesPerView - distance));
        let translateX = 0;
        let opacity = 1;
        
        // 为非当前卡片应用3D效果
        if (index !== currentSlide) {
            // 根据位置计算旋转角度
            rotateY = index < currentSlide ? -cardAngle : cardAngle;
            // 根据距离计算缩放比例
            scale = 1 - (distance * (1 - cardScale));
            // 计算X轴偏移
            translateX = index < currentSlide ? 
                -(cardWidth * scale * 0.8) : 
                (cardWidth * scale * 0.8);
            // 根据距离降低透明度
            opacity = 0.9 - (distance * 0.25);
        }
        
        let tz = cardZ * (1 - distance * 0.3) - cardZ/4;
        // 应用3D变换
        card.style.transform = `
            translateX(${translateX}px)
            rotateY(${rotateY}deg)
            scale(${scale})
            translateZ(${tz}px)
        `;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;
        card.style.center = '50%';
        card.style.marginLeft = `-${cardWidth / 2}px`;
        card.style.marginRight = `-${cardWidth / 2}px`;
    });

    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });

    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    prevBtn.style.opacity = currentSlide === 0 ? '0.3' : '1';
    nextBtn.style.opacity = currentSlide >= getMaxSlide() ? '0.3' : '1';
}

function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(index, getMaxSlide()));
    updateCarousel();
    resetAutoPlay();
}

function nextSlide() {
    currentSlide = currentSlide >= getMaxSlide() ? 0 : currentSlide + 1;
    updateCarousel();
}

function prevSlide() {
    currentSlide = currentSlide <= 0 ? getMaxSlide() : currentSlide - 1;
    updateCarousel();
}

function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(nextSlide, autoPlayInterval);
}

function stopAutoPlay() {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
}

function initCarousel() {
    renderCarouselCards();
    slidesPerView = getSlidesPerView();
    currentSlide = 0;
    updateCarousel();
    startAutoPlay();

    document.getElementById('carouselPrev').addEventListener('click', prevSlide);
    document.getElementById('carouselNext').addEventListener('click', nextSlide);

    const wrapper = document.getElementById('carouselWrapper');
    wrapper.addEventListener('mouseenter', stopAutoPlay);
    wrapper.addEventListener('mouseleave', startAutoPlay);

    let touchStartX = 0;
    wrapper.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoPlay();
    }, { passive: true });
    wrapper.addEventListener('touchend', function(e) {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide();
            else prevSlide();
        }
        startAutoPlay();
    });

    window.addEventListener('resize', function() {
        slidesPerView = getSlidesPerView();
        currentSlide = Math.min(currentSlide, getMaxSlide());
        updateCarousel();
    });
}

async function getNewData(pageCnt) {
    let result = [], total = 0;
    // 模拟加载时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
        const response = await fetch(`http://localhost:8080/api/lost-found?page=${pageCnt}&pageSize=10`, {
            method: 'GET',
        });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            total = data.data.total;
            data.data.list.forEach(it => {
                if(it.status !== 'OPEN')
                    return;
                let displayLocation;
                try {
                const parsedLocation = JSON.parse(it.location);
                if(parsedLocation[0] !== undefined) {
                    displayLocation = (typeof (parsedLocation[0]) === 'string' ? parsedLocation[0] : '特定') + ' ' + parsedLocation[1];
                } else
                    displayLocation = it.location;
                } catch (e) {
                displayLocation = it.location;
                }
                result.push({
                    id: it.id,
                    type: it.type.toLowerCase(),
                    item: it.title,
                    location: displayLocation,
                    desc: it.description,
                    date: it.occurredAt,
                    contact: it.type === 'LOST'?'联系失主':'联系施主',
                });
            });
            result.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    } catch (error) {
        console.error('初始化轮播失败:', error);
    }
    return {
        result,
        total
    };
}

// 页面加载时初始化轮播
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch(`http://localhost:8080/api/lost-found?page=1&pageSize=50&time=今天`, {
            method: 'GET',
        });
        const data = await response.json();
        if (data.code === 200 && data.data) {
            lostFoundData = [];
            data.data.list.forEach(it => {
                if(it.status !== 'OPEN')
                    return;
                let displayLocation;
                try {
                const parsedLocation = JSON.parse(it.location);
                if(parsedLocation[0] !== undefined) {
                    displayLocation = (typeof (parsedLocation[0]) === 'string' ? parsedLocation[0] : '特定') + ' ' + parsedLocation[1];
                } else
                    displayLocation = it.location;
                } catch (e) {
                displayLocation = it.location;
                }
                lostFoundData.push({
                    id: it.id,
                    type: it.type.toLowerCase(),
                    item: it.title,
                    location: displayLocation,
                    desc: it.description,
                    date: it.occurredAt,
                    contact: it.type === 'LOST'?'联系失主':'联系施主',
                });
            });
            lostFoundData.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    } catch (error) {
        console.error('初始化轮播失败:', error);
    }
    initCarousel();
    // 为功能卡片添加悬停动画效果
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        });
    });

    // ========== 背景曲线动画 ==========
    const bgCanvas = document.getElementById('bgCurveCanvas');
    if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d');
        let curves = [];
        let animationId = null;
        let activeCard = null;
        let cardRect = null;
        let isRunning = false;

        const colorPalettes = {
            pathfinder: ['#1a73e8', '#4285f4', '#0d47a1', '#64b5f6', '#1565c0', '#2196f3'],
            lostfound: ['#e65100', '#ff9800', '#ff7043', '#43a047', '#ef6c00', '#fb8c00']
        };

        function resizeBgCanvas() {
            const rect = bgCanvas.parentElement.getBoundingClientRect();
            bgCanvas.width = rect.width;
            bgCanvas.height = rect.height;
        }

        function createCurve(originX, originY, palette) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * 320;
            const colors = colorPalettes[palette];
            const endX = originX + Math.cos(angle) * dist;
            const endY = originY + Math.sin(angle) * dist;
            const cpAngle = angle + (Math.random() - 0.5) * Math.PI * 0.7;
            const cpDist = dist * (0.25 + Math.random() * 0.45);
            const cpX = originX + Math.cos(cpAngle) * cpDist;
            const cpY = originY + Math.sin(cpAngle) * cpDist;
            return {
                startX: originX, startY: originY,
                cpX, cpY, endX, endY,
                progress: 0,
                opacity: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                lineWidth: 0.8 + Math.random() * 2.2,
                speed: 0.004 + Math.random() * 0.018,
                fadeDelay: 0.35 + Math.random() * 0.35,
                maxLife: 1.2 + Math.random() * 2.5,
                life: 0
            };
        }

        function animate() {
            if (!isRunning) return;
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

            if (activeCard && cardRect && Math.random() < 0.35) {
                const cx = cardRect.left + cardRect.width / 2;
                const cy = cardRect.top + cardRect.height / 2;
                curves.push(createCurve(cx, cy, activeCard));
            }

            curves = curves.filter(curve => {
                curve.life += 0.016;
                if (curve.life > curve.maxLife) return false;
                if (curve.progress < 1) {
                    curve.progress = Math.min(1, curve.progress + curve.speed);
                }
                if (curve.life > curve.maxLife * curve.fadeDelay) {
                    const fp = (curve.life - curve.maxLife * curve.fadeDelay) / (curve.maxLife * (1 - curve.fadeDelay));
                    curve.opacity = Math.max(0, 1 - fp);
                }
                if (curve.opacity <= 0) return false;

                const t = curve.progress;
                const ex = (1 - t) * (1 - t) * curve.startX + 2 * (1 - t) * t * curve.cpX + t * t * curve.endX;
                const ey = (1 - t) * (1 - t) * curve.startY + 2 * (1 - t) * t * curve.cpY + t * t * curve.endY;

                bgCtx.beginPath();
                bgCtx.moveTo(curve.startX, curve.startY);
                bgCtx.quadraticCurveTo(curve.cpX, curve.cpY, ex, ey);
                bgCtx.strokeStyle = curve.color;
                bgCtx.globalAlpha = curve.opacity * 0.55;
                bgCtx.lineWidth = curve.lineWidth;
                bgCtx.lineCap = 'round';
                bgCtx.stroke();
                return true;
            });

            if (curves.length === 0 && !activeCard) {
                isRunning = false;
                bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
                return;
            }
            animationId = requestAnimationFrame(animate);
        }

        function startAnimation(cardType, rect) {
            activeCard = cardType;
            cardRect = rect;
            if (!isRunning) {
                isRunning = true;
                animationId = requestAnimationFrame(animate);
            }
        }

        function stopAnimation() {
            activeCard = null;
            cardRect = null;
        }

        const pathfinderCard = document.querySelector('.feature-card:nth-child(1)');
        const lostfoundCard = document.querySelector('.feature-card:nth-child(2)');

        if (pathfinderCard) {
            pathfinderCard.addEventListener('mouseenter', () => {
                startAnimation('pathfinder', pathfinderCard.getBoundingClientRect());
            });
            pathfinderCard.addEventListener('mouseleave', stopAnimation);
            pathfinderCard.addEventListener('mousemove', () => {
                if (activeCard === 'pathfinder') {
                    cardRect = pathfinderCard.getBoundingClientRect();
                }
            });
        }

        if (lostfoundCard) {
            lostfoundCard.addEventListener('mouseenter', () => {
                startAnimation('lostfound', lostfoundCard.getBoundingClientRect());
            });
            lostfoundCard.addEventListener('mouseleave', stopAnimation);
            lostfoundCard.addEventListener('mousemove', () => {
                if (activeCard === 'lostfound') {
                    cardRect = lostfoundCard.getBoundingClientRect();
                }
            });
        }

        resizeBgCanvas();
        window.addEventListener('resize', resizeBgCanvas);
    }
});

// ========== 瀑布流无限加载 ==========
let wfPageCnt = 1;
let wfHasMore = true;
let wfIsLoading = false;
let wfAllData = [];
let wfColIndex = 0;

const snapContainer = document.querySelector('.snap_container');
const waterflowSection = document.querySelector('.waterflow-section');
const loadingContainer = document.querySelector('.loading-container');
const wfColumns = [
    document.getElementById('wfCol0'),
    document.getElementById('wfCol1'),
    document.getElementById('wfCol2')
];

// 渲染加载动画
function renderLoading(state) {
    if (state === 'loading') {
        loadingContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
            <p class="loading-text">正在加载更多...</p>
        `;
        loadingContainer.style.display = 'flex';
    } else if (state === 'nomore') {
        loadingContainer.innerHTML = `
            <div class="loading-end">
                <span class="end-icon">🎉</span>
                <p class="loading-text">— 已经到底了，共 ${wfAllData.length} 条 —</p>
            </div>
        `;
        loadingContainer.style.display = 'flex';
    } else if (state === 'idle') {
        if (wfAllData.length === 0) {
            loadingContainer.style.display = 'none';
        } else {
            loadingContainer.innerHTML = `
                <div class="loading-trigger">
                    <span class="trigger-icon">⬇️</span>
                    <p class="loading-text">上拉加载更多</p>
                </div>
            `;
            loadingContainer.style.display = 'flex';
        }
    }
}

// 渲染瀑布流卡片
function renderWaterfallCards(items) {
    items.forEach(item => {
        const isLost = item.type === 'lost';
        const card = document.createElement('div');
        card.className = 'waterflow-card';
        card.innerHTML = `
            <div class="wf-card-top ${isLost ? 'wf-lost' : 'wf-found'}"></div>
            <div class="wf-card-body">
                <div class="wf-card-header">
                    <span class="wf-badge ${isLost ? 'wf-badge-lost' : 'wf-badge-found'}">${isLost ? '🔴 丢失' : '🟢 捡到'}</span>
                </div>
                <div class="wf-item-name">${item.item}</div>
                <div class="wf-location">📍 ${item.location}</div>
                ${item.desc ? `<div class="wf-desc">${item.desc}</div>` : ''}
                <div class="wf-footer">
                    <span class="wf-date">📅 ${item.date}</span>
                    <span class="wf-contact">${item.contact}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = './失物招领列表.html?id=' + item.id;
        });
        wfColumns[wfColIndex % 3].appendChild(card);
        wfColIndex++;
    });
}

let lastScrolPos = 0, timerIdxs = [];
// 加载更多数据
async function loadMoreData() {
    if(timerIdxs.length > 0)
        clearInterval(timerIdxs.pop());
    lastScrolPos = snap_container.scrollTop;
    if (wfIsLoading || !wfHasMore) return;
    wfIsLoading = true;
    renderLoading('loading');

    if(wfPageCnt > 1) {
        timerIdxs.push(setInterval(() => {
            if(snap_container.scrollTop !== lastScrolPos) {
                snap_container.scrollTo({top: lastScrolPos, behavior: "instant"});
            }
        }, 1));
    }
    const { result, total } = await getNewData(wfPageCnt);

    if (result.length > 0) {
        wfAllData = wfAllData.concat(result);
        renderWaterfallCards(result);
        wfPageCnt++;
    }

    // 判断是否还有更多数据
    if (wfAllData.length >= total || result.length === 0) {
        wfHasMore = false;
        renderLoading('nomore');
    } else {
        renderLoading('idle');
    }

    wfIsLoading = false;
    if(wfPageCnt > 2) {
        setTimeout(() => {
            if(timerIdxs.length > 0)
                clearInterval(timerIdxs.pop());
        }, 40);
    }
}

// 滚动监听
snapContainer.addEventListener('scroll', () => {
    if (!wfHasMore || wfIsLoading) return;
    const scrollTop = snapContainer.scrollTop;
    const scrollHeight = snapContainer.scrollHeight;
    const clientHeight = snapContainer.clientHeight;
    // 距离底部 20px 时触发加载
    if (scrollTop + clientHeight >= scrollHeight - 20) {
        loadMoreData();
    }
});

// 初始化：显示上拉提示
renderLoading('idle');