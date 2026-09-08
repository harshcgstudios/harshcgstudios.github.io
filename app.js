/**
 * VFX Portfolio JavaScript Controller
 * Client: Harsh Borah (VES Award-winning Asset Supervisor)
 * Author: Antigravity
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Navigation & Routing Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxProject = document.getElementById('lightbox-project');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxRole = document.getElementById('lightbox-role');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const specDate = document.getElementById('spec-date');
    const specTools = document.getElementById('spec-tools');
    const specCats = document.getElementById('spec-cats');
    const lightboxMedia = document.querySelector('.lightbox-media');

    // Image Zoom Overlay Creation
    const zoomOverlay = document.createElement('div');
    zoomOverlay.className = 'image-zoom-overlay';
    zoomOverlay.innerHTML = '<img src="" alt="Zoomed view">';
    document.body.appendChild(zoomOverlay);
    
    const zoomImg = zoomOverlay.querySelector('img');
    
    // Close zoom overlay on click
    zoomOverlay.addEventListener('click', () => {
        zoomOverlay.classList.remove('active');
        setTimeout(() => { zoomImg.src = ''; }, 300);
    });

    // Slideshow State
    let slideInterval = null;
    let currentSlideIndex = 0;
    let slideshowProjects = [];
    const slideDuration = 7000; // 7 seconds
    const parallaxControllers = {};
    
    // Ambient Audio State
    let bgAudio = null;
    let audioPlaying = false;
    let audioUserDisabled = false;
    let audioFadeInterval = null;
    let lastTime = 0;
    let progressTimer = 0;
    let isSlideshowPlaying = true;
    
    // Portfolio State
    let portfolioData = [
            {
                title: "Surviving Earth",
                hash_id: "mOZL5E",
                description: "<p>I worked as Asset Supervisor at Milk VFX on this project, supervising 70+ creatures. It was an honor to work with Tim Haines, creator of Walking With Dinosaurs. I was closely involved on designing creatures with Tim, and with VFX supervision of Jean-Claude Deguara and Hesun, this was a dream project! I managed best artists in the industry including Modelling, Texturing, Lookdev and Groom.</p>",
                categories: ["Creatures", "Visual Effects"],
                software_items: ["ZBrush", "Maya", "Mari", "Substance Painter"],
                assets: [
                    { id: 100280942, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/942/large/harsh-borah-imgi-40-723172613-18445586047137464-7449603301610559669-n.webp?1782399409", has_embedded_player: false },
                    { id: 100280977, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/977/large/harsh-borah-imgi-7-726890352-18445579789137464-7376861633970114897-n.webp?1782399444", has_embedded_player: false },
                    { id: 100280959, title: "", asset_type: "image", width: 3840, height: 2160, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/959/large/harsh-borah-imgi-20-692487421-18438730966137464-2285185690007896024-n.webp?1782399426", has_embedded_player: false },
                    { id: 100280955, title: "", asset_type: "image", width: 3840, height: 2160, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/955/large/harsh-borah-imgi-14-696124578-18439940464137464-7473179126323371430-n.webp?1782399421", has_embedded_player: false },
                    { id: 100280937, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/937/large/harsh-borah-imgi-41-723852799-18445586038137464-4957843160370906659-n.webp?1782399405", has_embedded_player: false },
                    { id: 100280974, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/974/large/harsh-borah-imgi-6-726289747-18445586029137464-3084903021843119168-n.webp?1782399440", has_embedded_player: false },
                    { id: 100280964, title: "", asset_type: "image", width: 3840, height: 2160, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/964/large/harsh-borah-imgi-21-685971549-18438730483137464-8666741084912701564-n.webp?1782399430", has_embedded_player: false },
                    { id: 100280980, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/980/large/harsh-borah-imgi-69-724653900-18445586020137464-793074095164595966-n.webp?1782399447", has_embedded_player: false },
                    { id: 100389365, title: "", asset_type: "image", width: 2160, height: 2700, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/389/365/large/harsh-borah-imgi-50-731072115-18432308545127848-3933240297134539540-n.jpg?1782758455", has_embedded_player: false },
                    { id: 100280970, title: "", asset_type: "image", width: 2160, height: 1215, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/970/large/harsh-borah-imgi-9-721403370-18444467518137464-5730764531528436149-n.webp?1782399437", has_embedded_player: false },
                    { id: 100280947, title: "", asset_type: "image", width: 3840, height: 2160, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/947/large/harsh-borah-imgi-16-694174329-18439296649137464-661187344100481609-n.webp?1782399416", has_embedded_player: false },
                    { id: 100280992, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/992/large/harsh-borah-imgi-2-727364564-18595182142001734-4634276943246346547-n.webp?1782399460", has_embedded_player: false },
                    { id: 100280996, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/996/large/harsh-borah-imgi-3-727979635-18595182160001734-5815205498222249043-n.webp?1782399463", has_embedded_player: false },
                    { id: 100280987, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/280/987/large/harsh-borah-imgi-3-726814846-18595182193001734-5016916710888012165-n.webp?1782399453", has_embedded_player: false },
                    { id: 100280982, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/982/large/harsh-borah-imgi-3-726954900-18595182226001734-8566057192196900153-n.webp?1782399451", has_embedded_player: false },
                    { id: 100280990, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdna.artstation.com/p/assets/images/images/100/280/990/large/harsh-borah-imgi-4-726868498-18595182211001734-1600159437133217034-n.webp?1782399457", has_embedded_player: false },
                    { id: 100281006, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdna.artstation.com/p/assets/images/images/100/281/006/large/harsh-borah-imgi-2-727057541-18595182262001734-4686767924851555285-n.webp?1782399467", has_embedded_player: false },
                    { id: 100281011, title: "", asset_type: "image", width: 1080, height: 1350, image_url: "https://cdnb.artstation.com/p/assets/images/images/100/281/011/large/harsh-borah-imgi-3-726674034-18595182316001734-3212139160318594349-n.webp?1782399473", has_embedded_player: false },
                    { id: 100381017, title: "", asset_type: "video", width: 1280, height: 720, image_url: "https://cdnb.artstation.com/p/assets/videos/images/100/381/017/large/harsh-borah-maxresdefault.jpg?1782740715", has_embedded_player: true, player_embedded: "<iframe   src=\"https://www.youtube-nocookie.com/embed/SsOyPYLA8A0?feature=oembed&rel=0\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"How Did the Dinosaurs Handle the Asteroid Hitting Earth? | Surviving Earth | NBC\"></iframe>" },
                    { id: 100281060, title: "", asset_type: "video", width: 1280, height: 720, image_url: "https://cdna.artstation.com/p/assets/videos/images/100/281/060/large/harsh-borah-maxresdefault.jpg?1782399570", has_embedded_player: true, player_embedded: "<iframe   src=\"https://www.youtube-nocookie.com/embed/MAog939yD8Q?start=359&feature=oembed&rel=0\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Scutosaurus Stampede Kills a Mother; Ischigualastia Herd Flees a Flood | Surviving Earth | NBC\"></iframe>" },
                    { id: 100281077, title: "", asset_type: "video", width: 1280, height: 720, image_url: "https://cdnb.artstation.com/p/assets/videos/images/100/281/077/large/harsh-borah-maxresdefault.jpg?1782399601", has_embedded_player: true, player_embedded: "<iframe   src=\"https://www.youtube-nocookie.com/embed/kNwfAA_Xvwg?start=147&feature=oembed&rel=0\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Baby Ischigualastia Narrowly Escapes Death in the Forest | Surviving Earth | NBC\"></iframe>" },
                    { id: 100281088, title: "", asset_type: "video", width: 1280, height: 720, image_url: "https://cdna.artstation.com/p/assets/videos/images/100/281/088/large/harsh-borah-maxresdefault.jpg?1782399618", has_embedded_player: true, player_embedded: "<iframe   src=\"https://www.youtube-nocookie.com/embed/Gyq7k-6OdS4?start=102&feature=oembed&rel=0\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Ancient Gorgons Flee Deadly Pangea Fire | Surviving Earth | NBC\"></iframe>" },
                    { id: 100281112, title: "", asset_type: "video", width: 1280, height: 720, image_url: "https://cdna.artstation.com/p/assets/videos/images/100/281/112/large/harsh-borah-maxresdefault.jpg?1782399654", has_embedded_player: true, player_embedded: "<iframe   src=\"https://www.youtube-nocookie.com/embed/FtsCG59IT5s?feature=oembed&rel=0\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Surviving Earth | Official Trailer | NBC\"></iframe>" }
                ]
            }
    ];

    let activeFilter = 'all';

    // Static Experience & Career Data (Tailored from LinkedIn Profile)
    const experienceData = [
        {
            date: "OCT 2021 - PRESENT",
            role: "Head of Assets / Asset Supervisor",
            company: "Milk VFX",
            desc: "Leading the modelling, texturing, lookdev, and grooming asset departments. Streamlining creature and digital human workflows, supervising high-end character asset development for TV and film projects like 'Surviving Earth' and commercial productions.",
            projects: [
                "Surviving Earth (Creature Asset Supervisor)",
                "Supervised team workflow and asset standards across creature pipelines",
                "FACS and 4D scanning workflow design"
            ]
        },
        {
            date: "JAN 2020 - SEPT 2021",
            role: "Lead Modeller / Creature Supervisor",
            company: "The Mill",
            desc: "Supervised and created high-fidelity digital humans, animals, and creatures for commercials and cinematic content. Led the modelling team to create the VES award-winning CG Albert Einstein character.",
            projects: [
                "Smart Energy: Einstein Knows Best (VES 2022 Award for Outstanding Animated Character)",
                "Led character asset modeling and facial blendshapes integration",
                "Advanced skin, facial expressions, and FACS pipeline supervising"
            ]
        },
        {
            date: "JUN 2018 - OCT 2019",
            role: "Lead Character Modeller",
            company: "DNEG",
            desc: "Directed character and creature asset modelling for massive film productions. Handled facial blendshapes, anatomy sculpts, and coordinated asset handoffs to riggers and animators.",
            projects: [
                "Avengers: Endgame (Digital human and creature assets)",
                "Fantastic Beasts: The Crimes of Grindelwald (Leta & Krall digi-doubles and disintegration VFX)",
                "Wonder Woman 1984 (Character assets and digital double sculpting)",
                "Designed and implemented high-fidelity character meshes"
            ]
        },
        {
            date: "NOV 2016 - APR 2018",
            role: "Lead Creature Modeller",
            company: "MPC (Moving Picture Company)",
            desc: "Led the character and creature modeling team for Disney's photorealistic CGI remake. Focused on anatomy modeling, fur growth topology, and lifelike asset creations.",
            projects: [
                "Disney's The Lion King (Lead Modeller / Creature Modeller)",
                "Supervised modeling team for primary animal assets",
                "High-end photorealistic creature sculpts"
            ]
        },
        {
            date: "OCT 2012 - OCT 2016",
            role: "Senior Character / Creature Artist",
            company: "Framestore",
            desc: "Created iconic visual assets and complex facial shapes. Specialized in FACS (Facial Action Coding System) shape modeling for digital creatures and CG humans.",
            projects: [
                "Guardians of the Galaxy Vol. 1 & 2 (Rocket Raccoon modeling & FACS blendshapes)",
                "Fantastic Beasts and Where to Find Them (Gnarlak the Goblin facial shapes)",
                "Fantastic Beasts: The Crimes of Grindelwald (Creature artist)",
                "Paddington (Creature modeller)"
            ]
        },
        {
            date: "2009 - 2012",
            role: "Character Modeller",
            company: "Lucasfilm (Singapore)",
            desc: "Built character assets, creatures, and hard-surface models for feature animations and VFX projects.",
            projects: [
                "Strange Magic (Character modeller)",
                "Integrated asset pipelines between Lucasfilm and ILM",
                "Collaborated with Medusa FACS capture research teams"
            ]
        }
    ];

    // Static Skills Data
    const skillCategories = [
        {
            name: "Supervision & Leadership",
            skills: ["Asset Pipeline Architecture", "Team Management & Mentoring", "Department Integration (Modeling/Rigging/Anim)", "FACS & 4D Scan Supervising", "VFX Bidding & Scheduling"]
        },
        {
            name: "Sculpting & Modeling",
            skills: ["Digital Human Portraits", "Creature Anatomy", "FACS Blendshapes (Facial Shapes)", "Hard-Surface Design", "Topology Optimization", "Groom / Hair Guides Layout"]
        },
        {
            name: "Software & Technology",
            skills: ["ZBrush", "Autodesk Maya", "Foundry Mari", "Substance 3D Painter", "Photoshop", "Di4D (Dynamic 4D)", "ILM Medusa Capture", "Wrap3D / R3D", "Unreal Engine"]
        }
    ];

    /* ==========================================================================
       Routing & Page Navigation
       ========================================================================== */
    function navigateToSection(targetId) {
        // Close details lightbox if active to stop any playing videos/audio
        closeLightbox();

        // Reset showreel video player to thumbnail layout if navigating away from showreel
        if (targetId !== 'showreel') {
            resetShowreelPlayer();
        }

        // Hide all sections and remove active from nav
        sections.forEach(sec => sec.classList.remove('active'));
        navItems.forEach(item => item.classList.remove('active'));
        
        // Find corresponding section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            // Scroll section back to top
            targetSection.scrollTop = 0;
        }
        
        // Mark active nav menu item
        const activeNavItem = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Handle Slideshow Play/Pause based on active section
        if (targetId === 'home') {
            startSlideshow();
            if (parallaxControllers[currentSlideIndex]) {
                parallaxControllers[currentSlideIndex].start();
            }
        } else {
            stopSlideshow();
            Object.values(parallaxControllers).forEach(ctrl => ctrl && ctrl.stop && ctrl.stop());
        }

        // Handle Ambient Audio (pause for showreel to avoid audio collision)
        if (targetId === 'showreel') {
            if (bgAudio && !bgAudio.paused) {
                bgAudio.pause();
            }
        } else {
            if (bgAudio && audioPlaying && !audioUserDisabled && bgAudio.paused) {
                bgAudio.play().catch(() => {});
            }
        }

        // Handle dynamic loading/unloading of heavy Anatomy 3D Viewer iframe to free up resources
        const anatomyIframe = document.getElementById('anatomy-iframe');
        if (anatomyIframe) {
            if (targetId === 'anatomy') {
                const dataSrc = anatomyIframe.getAttribute('data-src');
                if (dataSrc && (anatomyIframe.src === 'about:blank' || !anatomyIframe.src || anatomyIframe.src.endsWith('about:blank'))) {
                    anatomyIframe.src = dataSrc;
                }
            } else {
                // Navigating away: set src to about:blank to release WebGL, GPU and RAM resources
                if (anatomyIframe.src && !anatomyIframe.src.endsWith('about:blank')) {
                    anatomyIframe.src = 'about:blank';
                }
            }
        }

        // Record page view statistics
        recordPageView(targetId);

        // Close mobile sidebar if open
        if (sidebar.classList.contains('open')) {
            toggleMobileMenu();
        }
    }

    function recordPageView(pageName) {
        try {
            const payload = JSON.stringify({
                page: pageName,
                timestamp: new Date().toISOString()
            });
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/stats/record', payload);
            } else {
                fetch('/api/stats/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });
            }
        } catch (e) {
            console.error('Stats recording error:', e);
        }
    }

    function resetShowreelPlayer() {
        const reelPlayTrigger = document.getElementById('reel-play-trigger');
        if (reelPlayTrigger) {
            // Only rebuild layout if iframe is currently loaded to stop video/audio playback
            if (reelPlayTrigger.querySelector('iframe')) {
                reelPlayTrigger.innerHTML = `
                    <img class="reel-thumbnail" src="assets/images/hero_guardians.png?v=1.2" alt="Showreel Cover">
                    <div class="reel-overlay">
                        <div class="play-btn">
                            <div class="play-btn-pulse"></div>
                            <svg width="24" height="24" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Nav Item Click Listeners
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            navigateToSection(targetId);
        });
    });

    // Mobile Menu Toggle
    function toggleMobileMenu() {
        menuToggle.classList.toggle('open');
        sidebar.classList.toggle('open');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    /* ==========================================================================
       Data Loading & Rendering
       ========================================================================== */
    async function loadPortfolio() {
        try {
            const response = await fetch('assets/data/portfolio.json?t=' + Date.now());
            if (!response.ok) {
                throw new Error('Failed to load portfolio database');
            }
            portfolioData = await response.json();
            
            // Render components
            initializeSlideshowData();
            renderPortfolioGrid();
            
            // Handle URL routing for projects on load
            handleInitialHash();
        } catch (error) {
            console.error('Error loading portfolio:', error);
            // Render fallback layout with empty state or direct HTML integration
            renderFallbackPortfolio();
            
            // Handle URL routing for projects on load
            handleInitialHash();
        }
    }

    /* ==========================================================================
       Fullscreen Slideshow (Ken Burns Slider)
       ========================================================================== */
    function initializeSlideshowData() {
        // Select specific high-profile projects for the home slider
        // We'll search projects with key terms in their titles
        const featuredKeywords = ['maa', 'earth', 'surviving', 'lion', 'einstein', 'tarzan', 'paddington', 'morphology', 'guardians', 'avengers', 'xenomorph', 'grindelwald', 'fantastic', 'beasts'];
        
        slideshowProjects = portfolioData.filter(proj => {
            const titleLower = proj.title.toLowerCase();
            if (titleLower.includes('guardians of the galaxy 2') || titleLower.includes('ngannou')) return false;
            return featuredKeywords.some(keyword => titleLower.includes(keyword));
        });

        // Fallback: If not enough matches, take the first 4 projects
        if (slideshowProjects.length < 3) {
            slideshowProjects = portfolioData.slice(0, 5);
        }

        // Render Slides
        const slidesList = document.getElementById('slides-list');
        if (!slidesList) return;
        
        slidesList.innerHTML = '';
        
        slideshowProjects.forEach((proj, idx) => {
            const li = document.createElement('li');
            li.className = `slide ${idx === 0 ? 'active' : ''}`;
            
            // Get cover image and optional hero video from local fast assets
            let imageUrl = '';
            let videoUrl = '';
            const tLower = proj.title ? proj.title.toLowerCase() : '';
            if (tLower.includes('surviving')) {
                imageUrl = "assets/images/surviving_earth_slide.jpg";
                videoUrl = "assets/images/surviving_earth_slide.mp4";
            } else if (tLower.includes('maa')) {
                imageUrl = "assets/images/maa_slide.jpg";
                videoUrl = "assets/images/maa_slide.mp4";
            } else if (tLower.includes('ngannou')) {
                imageUrl = "assets/images/ngannou_slide.jpg";
            } else if (tLower.includes('guardians')) {
                imageUrl = "assets/images/guardians_slide.jpg";
                videoUrl = "assets/images/guardians_slide.mp4";
            } else if (tLower.includes('lion king')) {
                imageUrl = "assets/images/lion_king_slide.jpg";
                videoUrl = "assets/images/lion_king_slide.mp4";
            } else if (tLower.includes('tarzan')) {
                imageUrl = "assets/images/tarzan_slide.jpg";
                videoUrl = "assets/images/tarzan_slide.mp4";
            } else if (tLower.includes('avengers')) {
                imageUrl = "assets/images/avengers_slide.jpg";
                videoUrl = "assets/images/avengers_slide.mp4?v=1.79";
            } else if (tLower.includes('paddington')) {
                imageUrl = "assets/images/paddington_slide.jpg";
                videoUrl = "assets/images/paddington_slide.mp4";
            } else if (tLower.includes('xenomorph')) {
                imageUrl = "assets/images/xenomorph_slide.jpg";
            } else if (tLower.includes('mountain lion')) {
                imageUrl = "assets/images/mountain_lion_slide.jpg";
                videoUrl = "assets/images/mountain_lion_slide.mp4";
            } else if (tLower.includes('morphology')) {
                imageUrl = "assets/images/morphology_slide.jpg";
                videoUrl = "assets/images/morphology_slide.mp4";
            } else if (tLower.includes('einstein')) {
                imageUrl = "assets/images/einstein_slide.jpg";
                videoUrl = "assets/images/einstein_slide.mp4";
            } else if (tLower.includes('grindelwald')) {
                imageUrl = "assets/images/grindelwald_slide.jpg";
                videoUrl = "assets/images/grindelwald_slide.mp4";
            } else if (tLower.includes('fantastic') || tLower.includes('beasts')) {
                imageUrl = "assets/images/fantastic_beasts_slide.jpg";
                videoUrl = "assets/images/fantastic_beasts_slide.mp4";
            } else {
                const firstAsset = proj.assets && proj.assets.length > 0 ? proj.assets[0] : null;
                imageUrl = firstAsset ? firstAsset.image_url : '';
            }
            
            // Format category
            let categoryText = proj.categories && proj.categories.length > 0 ? proj.categories.join(' / ') : 'VFX Asset';
            if (tLower.includes('surviving')) {
                categoryText = 'Asset Supervisor';
            } else if (tLower.includes('morphology')) {
                categoryText = 'ML 3D Assets';
            }
            
            const isPoster = !videoUrl && proj.title && (proj.title.toLowerCase().includes('lion king') || proj.title.toLowerCase().includes('guardians') || proj.title.toLowerCase().includes('avengers') || proj.title.toLowerCase().includes('ngannou') || proj.title.toLowerCase().includes('grindelwald'));
            const slideTitle = proj.title.toLowerCase().includes('xenomorph') ? 'Aliens' : proj.title;
            
            const isFirst = idx === 0;
            const srcAttr = isFirst ? `src="${imageUrl}"` : `src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3C/svg%3E" data-src="${imageUrl}"`;
            
            li.innerHTML = `
                <div class="slide-image-wrapper ${isPoster ? 'poster-wrapper' : ''}">
                    ${videoUrl ? `
                        <video class="slide-video" autoplay loop muted playsinline preload="auto" poster="${imageUrl}">
                            <source src="${videoUrl}" type="video/mp4">
                        </video>
                    ` : `
                        ${isPoster ? `<img class="slide-image-bg" ${srcAttr} alt="" />` : ''}
                        <img class="slide-image ${isPoster ? 'slide-image-contain' : ''}" ${srcAttr} alt="${slideTitle}" loading="${isFirst ? 'eager' : 'lazy'}" />
                    `}
                </div>
                <div class="slide-content">
                    <div class="slide-meta">${categoryText}</div>
                    <h2 class="slide-title">${slideTitle}</h2>
                    <button class="slide-btn" data-project-hash="${proj.hash_id}">
                        View Project details
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            `;
            slidesList.appendChild(li);
        });

        // Add event listeners to slideshow detail buttons
        document.querySelectorAll('.slide-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const hash = btn.getAttribute('data-project-hash');
                if (hash) {
                    openProjectDetails(hash, true);
                }
            });
        });

        // Initialize progress bar
        updateProgressBar();
        startSlideshow();
        
        // Pre-decode next slide's images (slide 1) ahead of time
        predecodeNextSlide(0);
    }

    function predecodeNextSlide(index) {
        const slides = document.querySelectorAll('.slide');
        if (slides.length <= 1) return;
        
        const nextIndex = (index + 1) % slides.length;
        const nextSlide = slides[nextIndex];
        
        const lazyImages = nextSlide.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            const src = img.getAttribute('data-src');
            if (src) {
                const tempImg = new Image();
                tempImg.src = src;
                tempImg.decode().then(() => {
                    img.src = src;
                    img.removeAttribute('data-src');
                }).catch(() => {
                    img.src = src;
                    img.removeAttribute('data-src');
                });
            }
        });
    }

    function startSlideshow() {
        if (slideInterval) clearInterval(slideInterval);
        
        isSlideshowPlaying = true;
        
        slideInterval = setInterval(() => {
            if (isSlideshowPlaying) {
                changeSlide(1);
            }
        }, slideDuration);
        
        animateProgressBar();

        // Play active slide video if present
        const activeSlide = document.querySelector('.slide.active');
        if (activeSlide) {
            const vid = activeSlide.querySelector('video');
            if (vid) vid.play().catch(() => {});
        }
    }

    function stopSlideshow() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
        isSlideshowPlaying = false;
        resetProgressBar();

        // Pause all slide videos
        document.querySelectorAll('.slide video').forEach(v => v.pause());
    }

    function changeSlide(direction) {
        const slides = document.querySelectorAll('.slide');
        if (slides.length === 0) return;
        
        // Pause current slide video
        const prevSlide = slides[currentSlideIndex];
        if (prevSlide) {
            const prevVid = prevSlide.querySelector('video');
            if (prevVid) prevVid.pause();
            prevSlide.classList.remove('active');
        }
        
        currentSlideIndex = (currentSlideIndex + direction + slides.length) % slides.length;
        
        const nextSlide = slides[currentSlideIndex];
        
        // Immediate fallback load of slide images if not pre-decoded yet
        const lazyImages = nextSlide.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
        });
        
        nextSlide.classList.add('active');

        // Play video in new active slide
        const nextVid = nextSlide.querySelector('video');
        if (nextVid) {
            nextVid.currentTime = 0;
            nextVid.play().catch(() => {});
        }
        
        resetProgressBar();
        animateProgressBar();
        
        // Pre-decode next slide's images in sequence
        predecodeNextSlide(currentSlideIndex);
    }

    // Set Slider buttons listeners
    const sliderPrev = document.getElementById('slider-prev');
    const sliderNext = document.getElementById('slider-next');
    
    if (sliderPrev) {
        sliderPrev.addEventListener('click', () => {
            changeSlide(-1);
            // Reset interval on manual click
            if (isSlideshowPlaying) startSlideshow();
        });
    }
    if (sliderNext) {
        sliderNext.addEventListener('click', () => {
            changeSlide(1);
            // Reset interval on manual click
            if (isSlideshowPlaying) startSlideshow();
        });
    }

    // Progress Bar Animation (CSS-based for CPU optimization and smooth rendering)
    function animateProgressBar() {
        const progressBar = document.getElementById('slider-progress');
        if (!progressBar) return;
        
        progressBar.classList.remove('animating');
        
        // Use double requestAnimationFrame to toggle class in successive frames
        // This avoids forcing a synchronous layout/reflow with offsetWidth query
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                progressBar.classList.add('animating');
            });
        });
    }

    function resetProgressBar() {
        const progressBar = document.getElementById('slider-progress');
        if (progressBar) {
            progressBar.classList.remove('animating');
        }
    }
    
    function updateProgressBar() {
        // Placeholder update if needed
    }

    /* ==========================================================================
       Portfolio Grid & Categories Filters
       ========================================================================== */
    function renderPortfolioGrid() {
        const grid = document.getElementById('artwork-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Filter portfolio data based on current selection
        let filtered = portfolioData;
        
        if (activeFilter !== 'all') {
            filtered = portfolioData.filter(proj => {
                const cats = proj.categories.map(c => c.toLowerCase());
                const tags = proj.tags.map(t => t.toLowerCase());
                const titleLower = proj.title.toLowerCase();

                if (activeFilter === 'film') {
                    // Match Film & TV
                    return cats.includes('film') || cats.includes('tv') || cats.includes('visual effects') || 
                           tags.includes('film') || tags.includes('vfx') ||
                           titleLower.includes('lion') || titleLower.includes('avengers') || titleLower.includes('beasts') || titleLower.includes('guardians');
                } else if (activeFilter === 'creatures') {
                    // Match Creatures & Characters
                    return cats.includes('characters') || cats.includes('creatures') || cats.includes('modelling') ||
                           tags.includes('creature') || tags.includes('character') || tags.includes('anatomy') ||
                           titleLower.includes('lion') || titleLower.includes('raccoon') || titleLower.includes('queen') || titleLower.includes('ngannou') || titleLower.includes('hellboy') || titleLower.includes('einstein') || titleLower.includes('beasts') || titleLower.includes('grindelwald');
                } else if (activeFilter === 'facs') {
                    // Match FACS & Digital Humans
                    return tags.includes('facs') || tags.includes('blendshapes') || tags.includes('face') || tags.includes('digital human') ||
                           titleLower.includes('facs') || titleLower.includes('expression') || titleLower.includes('einstein') || titleLower.includes('facial') || titleLower.includes('beasts') || titleLower.includes('grindelwald');
                } else if (activeFilter === 'personal') {
                    // Match Personal Projects
                    const personalTitles = ['synthetic morphology', 'xenomorph queen', 'portrait sculpture', 'adam', 'portraits', 'dragon'];
                    return personalTitles.includes(titleLower);
                }
                return false;
            });
        }

        // Render projects
        filtered.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'artwork-card';
            card.setAttribute('data-hash', proj.hash_id);
            
            let imageUrl = '';
            if (proj.title && proj.title.toLowerCase().includes('ngannou')) {
                imageUrl = "https://cdna.artstation.com/p/assets/images/images/074/287/086/large/harsh-borah-ngannou-renders-0003.jpg?1711674256";
            } else if (proj.title && proj.title.toLowerCase().includes('guardians of the galaxy 2')) {
                imageUrl = "assets/images/guardians_slide.jpg";
            } else if (proj.title && proj.title.toLowerCase().includes('guardians')) {
                imageUrl = "assets/images/guardians_slide.jpg";
            } else if (proj.title && proj.title.toLowerCase().includes('lion king')) {
                imageUrl = "assets/images/lion_king_slide.jpg";
            } else if (proj.title && proj.title.toLowerCase().includes('tarzan')) {
                imageUrl = "https://cdna.artstation.com/p/assets/images/images/004/309/796/large/harsh-borah-savannah05.jpg?1482281585";
            } else if (proj.title && proj.title.toLowerCase().includes('avengers')) {
                imageUrl = "assets/images/avengers_slide.jpg";
            } else if (proj.title && proj.title.toLowerCase().includes('paddington')) {
                imageUrl = "https://cdna.artstation.com/p/assets/images/images/010/825/344/large/harsh-borah-vlcsnap-00014.jpg?1526427408";
            } else if (proj.title && proj.title.toLowerCase().includes('xenomorph')) {
                imageUrl = "https://cdnb.artstation.com/p/assets/images/images/010/845/447/large/harsh-borah-alien02-232.jpg?1526522674";
            } else if (proj.title && proj.title.toLowerCase().includes('grindelwald')) {
                imageUrl = "assets/images/grindelwald_slide.jpg";
            } else {
                const firstAsset = proj.assets && proj.assets.length > 0 ? proj.assets[0] : null;
                imageUrl = firstAsset ? firstAsset.image_url : '';
            }
            let medium = proj.categories && proj.categories.length > 0 ? proj.categories[0] : 'VFX Asset';
            if (proj.title && proj.title.toLowerCase().includes('morphology')) {
                medium = 'ML 3D Assets';
            }
            const role = proj.software_items && proj.software_items.length > 0 ? proj.software_items[0] : 'Supervisor';
            
            card.innerHTML = `
                <div class="artwork-image-wrapper">
                    <img class="artwork-image" src="${imageUrl}" alt="${proj.title}" loading="lazy" />
                    <div class="artwork-overlay"></div>
                </div>
                <div class="artwork-info">
                    <h3 class="artwork-title">${proj.title}</h3>
                    <div class="artwork-meta">
                        <span class="artwork-project">${medium}</span>
                        <span class="artwork-role">${role}</span>
                    </div>
                </div>
            `;
            
            // Add click listener
            card.addEventListener('click', () => {
                openProjectDetails(proj.hash_id, true);
            });
            
            grid.appendChild(card);
        });
    }

    // Set Filter Tabs Listeners
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeFilter = btn.getAttribute('data-filter');
            renderPortfolioGrid();
        });
    });

    /* ==========================================================================
       Project Details Lightbox Modal
       ========================================================================== */
    function openProjectDetails(hashId, updateHash = true) {
        const proj = portfolioData.find(p => p.hash_id === hashId || String(p.id) === String(hashId));
        if (!proj) {
            console.warn('Project not found for:', hashId);
            return;
        }
        
        const titleLower = proj.title ? proj.title.toLowerCase() : '';
        
        if (updateHash) {
            window.location.hash = `project/${proj.hash_id || hashId}`;
        }
        
        // Reset lightbox media container
        lightboxMedia.innerHTML = '';
        
        // Pause ambient audio while viewing project media
        if (bgAudio && !bgAudio.paused) {
            bgAudio.pause();
        }
        
        // Populate static info
        lightboxTitle.innerText = proj.title;
        lightboxProject.innerText = (proj.categories && proj.categories.length > 0) ? proj.categories.join(' / ') : (titleLower.includes('morphology') ? 'ML 3D Assets' : 'ArtStation Project');
        lightboxDesc.innerHTML = proj.description || '<p>Detailed breakdown of this VFX asset creation.</p>';
        
        // Formulate role badge text
        let role = "Facial & Creature Asset Supervisor";
        if (titleLower.includes('einstein') || titleLower.includes('ngannou')) {
            role = "VES Award-Winning Lead Modeller";
        } else if (titleLower.includes('lion')) {
            role = "Lead Creature Modeller / MPC Film";
        } else if (titleLower.includes('morphology')) {
            role = "Asset Supervisor / Character Artist";
        } else if (titleLower.includes('surviving') || titleLower.includes('earth')) {
            role = "Asset Supervisor / Milk VFX";
        } else if (titleLower.includes('maa')) {
            role = "Senior Creature Artist / Netflix Movie";
        } else if (titleLower.includes('grindelwald') || titleLower.includes('beasts')) {
            role = "Digital Doubles & FACS Modeller / DNEG London";
        }
        lightboxRole.innerText = role;
        
        // Set Spec Values
        specDate.innerText = proj.created_at ? new Date(proj.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : "Recent Works";
        
        // Set Categories spec
        specCats.innerText = (proj.categories && proj.categories.length > 0) ? proj.categories.join(', ') : (titleLower.includes('morphology') ? 'ML 3D Assets' : 'VFX Asset');
        
        // Set Software Spec
        specTools.innerHTML = '';
        if (proj.software_items && proj.software_items.length > 0) {
            proj.software_items.forEach(tool => {
                const tag = document.createElement('span');
                tag.className = 'spec-tool-tag';
                tag.innerText = tool;
                specTools.appendChild(tag);
            });
        } else {
            // Default tools fallback
            ['ZBrush', 'Maya', 'Mari', 'Photoshop'].forEach(tool => {
                const tag = document.createElement('span');
                tag.className = 'spec-tool-tag';
                tag.innerText = tool;
                specTools.appendChild(tag);
            });
        }

        // Render Media List
        if (proj.assets && proj.assets.length > 0) {
            // If there's multiple assets, create a scrollable list or carousel inside lightbox media
            const container = document.createElement('div');
            container.className = 'lightbox-media-list';
            
            proj.assets.forEach(asset => {
                if (asset.asset_type === 'image') {
                    const img = document.createElement('img');
                    img.src = asset.image_url;
                    img.alt = asset.title || proj.title;
                    img.className = 'lightbox-media-image';
                    img.loading = 'lazy';
                    
                    // Click to Zoom Fullscreen
                    img.addEventListener('click', () => {
                        zoomImg.src = asset.image_url;
                        zoomImg.alt = img.alt;
                        zoomOverlay.classList.add('active');
                    });
                    
                    container.appendChild(img);
                } else if (asset.asset_type === 'video' || asset.asset_type === 'video_clip') {
                    // Embed video
                    const videoBox = document.createElement('div');
                    videoBox.className = 'lightbox-video-container';
                    
                    if (asset.video_url && asset.video_url.includes('.mp4')) {
                        // Play direct CDN MP4 files natively
                        videoBox.innerHTML = `
                            <video width="100%" height="100%" controls loop playsinline preload="auto" style="width: 100%; height: 100%; object-fit: contain;" poster="${asset.image_url || ''}">
                                <source src="${asset.video_url}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        `;
                    } else if (asset.player_embedded) {
                        videoBox.innerHTML = asset.player_embedded;
                    } else {
                        // Simulated video embed if no direct source
                        videoBox.innerHTML = `
                            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-direction:column;gap:10px;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                <span>Video Asset: ${asset.title || 'Untitled'}</span>
                            </div>
                        `;
                    }
                    container.appendChild(videoBox);
                }
            });
            lightboxMedia.appendChild(container);
        } else {
            // Fallback cover image
            const img = document.createElement('img');
            img.src = 'assets/images/project_fantastic_beasts.png?v=1.2';
            img.alt = proj.title;
            img.className = 'lightbox-image';
            
            // Click to Zoom Fullscreen
            img.addEventListener('click', () => {
                zoomImg.src = img.src;
                zoomImg.alt = img.alt;
                zoomOverlay.classList.add('active');
            });
            
            lightboxMedia.appendChild(img);
        }
        
        // Show Lightbox
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop background scrolling
    }

    function closeLightbox(updateHash = true) {
        const shouldUpdateHash = (updateHash === true || typeof updateHash === 'object');
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Resume scrolling
        // Destroy media elements to stop any video or audio playback instantly
        lightboxMedia.innerHTML = '';
        
        // Resume ambient audio if not disabled by user (and not on showreel)
        const showreelSec = document.getElementById('showreel');
        const isShowreel = showreelSec && showreelSec.classList.contains('active');
        if (bgAudio && audioPlaying && !audioUserDisabled && !isShowreel) {
            bgAudio.play().catch(() => {});
        }
        
        if (shouldUpdateHash && window.location.hash.includes('project/')) {
            if (history.pushState) {
                history.pushState("", document.title, window.location.pathname + window.location.search);
            } else {
                window.location.hash = '';
            }
        }
    }

    // URL Routing Helpers for Deep Linking
    function handleInitialHash() {
        const hash = window.location.hash;
        const match = hash.match(/^#\/?project\/([a-zA-Z0-9_-]+)$/);
        if (match) {
            const projectId = match[1];
            navigateToSection('portfolio');
            openProjectDetails(projectId, false);
        }
    }

    // Listen for hash changes (e.g. back/forward browser buttons)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        const match = hash.match(/^#\/?project\/([a-zA-Z0-9_-]+)$/);
        if (match) {
            const projectId = match[1];
            openProjectDetails(projectId, false);
        } else {
            closeLightbox(false);
        }
    });


    // VES Award click listener to open VES project
    document.querySelectorAll('.sidebar-ves-trophy, .artist-award-badge').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = el.getAttribute('data-project-hash') || 'B32dX6';
            openProjectDetails(hash, true);
        });
    });

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }
    
    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // ESC key press to close zoom overlay or lightbox
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (zoomOverlay.classList.contains('active')) {
                zoomOverlay.classList.remove('active');
                setTimeout(() => { zoomImg.src = ''; }, 300);
            } else if (lightbox.classList.contains('active')) {
                closeLightbox();
            }
        }
    });

    /* ==========================================================================
       Interactive Resume & Timelines Renders
       ========================================================================== */
    function renderTimeline() {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        experienceData.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            const projectItems = exp.projects.map(p => `<li>${p}</li>`).join('');
            
            item.innerHTML = `
                <div class="timeline-node"></div>
                <div class="timeline-header">
                    <span class="timeline-date">${exp.date}</span>
                    <h4 class="timeline-role">${exp.role}</h4>
                </div>
                <div class="timeline-company">${exp.company}</div>
                <p class="timeline-desc">${exp.desc}</p>
                <ul class="timeline-projects">${projectItems}</ul>
            `;
            
            container.appendChild(item);
        });
    }

    function renderSkillsGrid() {
        const col = document.getElementById('skills-column');
        if (!col) return;
        
        col.innerHTML = '';
        
        skillCategories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'skills-card';
            
            const tags = cat.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
            
            // Icon choosing
            let icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'; // default users
            if (cat.name.includes('Sculpting')) {
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'; // Shield/Model
            } else if (cat.name.includes('Software')) {
                icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>'; // Tech/Server
            }

            card.innerHTML = `
                <h4 class="skills-card-title">
                    ${icon}
                    ${cat.name}
                </h4>
                <div class="skills-tags">${tags}</div>
            `;
            
            col.appendChild(card);
        });
    }

    /* ==========================================================================
       Contact Form Submission Handling
       ========================================================================== */
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Reset status
            formStatus.className = 'form-status';
            formStatus.innerText = '';
            
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const msgInput = document.getElementById('message');
            
            // Simple validation
            if (!nameInput.value || !emailInput.value || !msgInput.value) {
                formStatus.classList.add('error');
                formStatus.innerText = 'Please complete all form fields.';
                return;
            }
            
            // Email format verification
            const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailReg.test(emailInput.value)) {
                formStatus.classList.add('error');
                formStatus.innerText = 'Please provide a valid email address.';
                return;
            }

            // Simulate form submission
            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalBtnHtml = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s infinite linear;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                Sending Message...
            `;
            
            // Styles for spinner
            const style = document.createElement('style');
            style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);

            setTimeout(() => {
                // Return success
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
                
                // Clear fields
                nameInput.value = '';
                emailInput.value = '';
                msgInput.value = '';
                
                formStatus.classList.add('success');
                formStatus.innerText = 'Thank you! Your message has been sent successfully. Harsh will contact you soon.';
                
                setTimeout(() => {
                    formStatus.style.opacity = '0';
                    setTimeout(() => {
                        formStatus.className = 'form-status';
                        formStatus.innerText = '';
                        formStatus.style.opacity = '1';
                    }, 300);
                }, 5000);
            }, 1500);
        });
    }

    /* ==========================================================================
       Fallbacks for Offline / Local File Preview
       ========================================================================== */
    function renderFallbackPortfolio() {
        console.log('Rendering fallback template mock data...');
        // Mock data to ensure the website is always gorgeous even if portfolio.json doesn't load
        portfolioData = [
            {
                title: "Mountain Lion - Me time",
                hash_id: "QKxder",
                description: "<p>A detailed 3D study and sculpt of a mountain lion. Sculpted in ZBrush, textured in Mari, using advanced hair guide and groom setups.</p>",
                categories: ["Creatures", "Visual Effects"],
                software_items: ["ZBrush", "Mari", "Maya"],
                assets: [
                    { image_url: "assets/images/hero_lion_king.png?v=1.2", asset_type: "image" },
                    { 
                        image_url: "https://cdnb.artstation.com/p/assets/video_clips/images/081/478/633/large/harsh-borah-thumb.jpg", 
                        video_url: "https://cdn.artstation.com/p/video_sources/002/255/325/metime-face.mp4", 
                        asset_type: "video_clip" 
                    },
                    { 
                        image_url: "https://cdnb.artstation.com/p/assets/video_clips/images/081/512/867/large/harsh-borah-thumb.jpg", 
                        video_url: "https://cdn.artstation.com/p/video_sources/002/257/084/metime-walk.mp4", 
                        asset_type: "video_clip" 
                    },
                    { 
                        player_embedded: `<iframe src="https://www.youtube-nocookie.com/embed/lfc2uGRWf80?feature=oembed&rel=0" frameborder="0" allowfullscreen></iframe>`, 
                        asset_type: "video" 
                    }
                ]
            },
            {
                title: "Synthetic Morphology",
                hash_id: "rla1PG",
                description: "<p>An exploration of biomechanical design and organic fusion. Sculpting workflows and high fidelity skin rendering tests.</p>",
                categories: ["Characters", "Modelling"],
                software_items: ["ZBrush", "Substance Painter", "Maya"],
                assets: [
                    { image_url: "https://cdnb.artstation.com/p/assets/images/images/098/390/215/large/harsh-borah-39274.jpg?1776926821", asset_type: "image" },
                    { 
                        image_url: "https://cdna.artstation.com/p/assets/video_clips/images/098/180/266/large/harsh-borah-thumb.jpg", 
                        video_url: "https://cdn.artstation.com/p/video_sources/003/224/250/hovership.mp4", 
                        asset_type: "video_clip" 
                    }
                ]
            },
            {
                title: "CG Albert Einstein",
                hash_id: "einstein",
                description: "<p>Highly realistic digital human model of Albert Einstein for The Mill commercial. Won the 2022 VES Award for Outstanding Animated Character in a Commercial.</p>",
                categories: ["Digital Humans", "FACS"],
                software_items: ["ZBrush", "Mari", "Maya", "Photoshop"],
                assets: [
                    { image_url: "assets/images/hero_einstein.png?v=1.2", asset_type: "image" },
                    { 
                        player_embedded: `<iframe src="https://www.youtube-nocookie.com/embed/n4pYV47oDts?feature=oembed&rel=0" frameborder="0" allowfullscreen></iframe>`, 
                        asset_type: "video" 
                    }
                ]
            },
            {
                title: "Xenomorph Queen",
                hash_id: "xenomorph",
                description: "<p>A photorealistic creature study of the Alien Queen. Highly detailed organic textures, chitinous sheen, and high-frequency anatomical details.</p>",
                categories: ["Creatures", "Visual Effects"],
                software_items: ["ZBrush", "Substance Painter", "Maya"],
                assets: [
                    { image_url: "assets/images/project_xenomorph_queen.png?v=1.2", asset_type: "image" },
                    { 
                        player_embedded: `<iframe src="https://www.youtube-nocookie.com/embed/xPz1ZpXz6Zc?feature=oembed&rel=0" frameborder="0" allowfullscreen></iframe>`, 
                        asset_type: "video" 
                    }
                ]
            },
            {
                title: "Paddington",
                hash_id: "5ky1w",
                description: "<p>I modeled the Dog+facial shapes Paddington carries in tube station. I also modeled Paddington's Suitcase.</p>",
                categories: ["Creatures", "Modelling"],
                software_items: ["ZBrush", "Mari", "Maya"],
                assets: [
                    { image_url: "https://cdna.artstation.com/p/assets/images/images/010/825/344/large/harsh-borah-vlcsnap-00014.jpg?1526427408", asset_type: "image" }
                ]
            }
        ];
        
        initializeSlideshowData();
        renderPortfolioGrid();
    }

    /* ==========================================================================
       Scroll Navigation (Home <-> Portfolio)
       ========================================================================== */
    let isScrollTransitioning = false;
    
    window.addEventListener('wheel', (e) => {
        if (isScrollTransitioning) return;
        
        // Don't intercept scroll if modal is open
        if (lightbox.classList.contains('active')) return;
        
        const activeSection = document.querySelector('.section.active');
        if (!activeSection) return;
        
        const activeId = activeSection.id;
        
        if (activeId === 'home') {
            if (e.deltaY > 0) {
                // Scroll down -> go to portfolio
                isScrollTransitioning = true;
                navigateToSection('portfolio');
                setTimeout(() => { isScrollTransitioning = false; }, 800);
            }
        } else if (activeId === 'portfolio') {
            if (e.deltaY < 0 && activeSection.scrollTop === 0) {
                // Scroll up at top -> return to home
                isScrollTransitioning = true;
                navigateToSection('home');
                setTimeout(() => { isScrollTransitioning = false; }, 800);
            }
        }
    }, { passive: true });

    // Touch Swipe Navigation for Mobile
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    window.addEventListener('touchend', (e) => {
        if (isScrollTransitioning) return;
        if (lightbox.classList.contains('active')) return;
        
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchStartY - touchEndY;
        
        const activeSection = document.querySelector('.section.active');
        if (!activeSection) return;
        
        const activeId = activeSection.id;
        
        if (activeId === 'home') {
            if (diffY > 70) { // Swiped up (scroll down)
                isScrollTransitioning = true;
                navigateToSection('portfolio');
                setTimeout(() => { isScrollTransitioning = false; }, 800);
            }
        } else if (activeId === 'portfolio') {
            if (diffY < -70 && activeSection.scrollTop === 0) { // Swiped down (scroll up)
                isScrollTransitioning = true;
                navigateToSection('home');
                setTimeout(() => { isScrollTransitioning = false; }, 800);
            }
        }
    }, { passive: true });

    /* ==========================================================================
       Tools & Workflows Simulators Interactivity
       ========================================================================== */
    function initToolsSimulators() {
        // 1. Asset Browser Simulator
        const assetSidebar = document.getElementById('asset-sidebar');
        const assetGrid = document.getElementById('asset-grid');
        
        if (assetSidebar && assetGrid) {
            const assetData = {
                shotgrid: [
                    { thumb: '🎬', name: 'seq_010_shot_05' },
                    { thumb: '🎥', name: 'cam_render_v4' },
                    { thumb: '🎭', name: 'anim_cache_v12' }
                ],
                '3d': [
                    { thumb: '🦁', name: 'Lion_Body_v2' },
                    { thumb: '👽', name: 'Xeno_Queen_v1' },
                    { thumb: '🧝', name: 'Goblin_Gnarlak' }
                ],
                '2d': [
                    { thumb: '🧱', name: 'Brick_Albedo' },
                    { thumb: '🪵', name: 'Wood_Displace' },
                    { thumb: '🪙', name: 'Coin_Metalness' }
                ],
                hdri: [
                    { thumb: '☀️', name: 'Studio_Softbox' },
                    { thumb: '🌌', name: 'Milkyway_Night' },
                    { thumb: '🏔️', name: 'Mountain_Sunset' }
                ],
                videos: [
                    { thumb: '🎞️', name: 'Turntable_Lion' },
                    { thumb: '📽', name: 'Einstein_FACS_Reel' },
                    { thumb: '🎬', name: 'Hellboy_Breakdown' }
                ]
            };
            
            assetSidebar.querySelectorAll('.sim-side-item').forEach(item => {
                item.addEventListener('click', () => {
                    assetSidebar.querySelectorAll('.sim-side-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    const category = item.getAttribute('data-cat');
                    const items = assetData[category] || [];
                    
                    assetGrid.innerHTML = '';
                    items.forEach(asset => {
                        const card = document.createElement('div');
                        card.className = 'sim-grid-card';
                        card.innerHTML = `
                            <div class="sim-card-thumb">${asset.thumb}</div>
                            <div class="sim-card-name">${asset.name}</div>
                        `;
                        assetGrid.appendChild(card);
                    });
                });
            });
        }
        
        // 2. DCC MCP Console Simulator
        const consoleContainer = document.getElementById('mcp-console-lines');
        if (consoleContainer) {
            const logTemplates = [
                () => `<div class="console-line text-purple">[RPC] call_mcp_tool: get_scene_info from Blender client</div>`,
                () => `<div class="console-line">[EXEC] Running python scripts in Maya core...</div>`,
                () => `<div class="console-line text-green">[SYNC] Geometry synced: 42 blendshapes updated successfully</div>`,
                () => `<div class="console-line text-blue">[CONN] Houdini engine connected on port 3001</div>`,
                () => `<div class="console-line">[RPC] call_mcp_tool: set_texture to Mari layer 'skin_disp'</div>`,
                () => `<div class="console-line text-yellow">[WARN] ZBrush: Virtual memory footprint exceeding 80%</div>`,
                () => `<div class="console-line">[SYNC] Exported cache: cache_facs_einstein.abc</div>`,
                () => `<div class="console-line text-green">[CONN] Handshake success with Mari v7.0</div>`
            ];
            
            setInterval(() => {
                const toolsSection = document.getElementById('tools');
                if (toolsSection && toolsSection.classList.contains('active')) {
                    const randomTemplate = logTemplates[Math.floor(Math.random() * logTemplates.length)];
                    const newLine = document.createElement('div');
                    newLine.innerHTML = randomTemplate();
                    
                    consoleContainer.appendChild(newLine.firstElementChild);
                    consoleContainer.scrollTop = consoleContainer.scrollHeight;
                    
                    // Keep logs clean, slice old logs if too many
                    while (consoleContainer.children.length > 7) {
                        consoleContainer.removeChild(consoleContainer.firstChild);
                    }
                }
            }, 3000);
        }
        
        // 3. AI Texture Simulator
        const generateBtn = document.getElementById('generate-texture-btn');
        const promptInput = document.getElementById('texture-prompt');
        const progressBar = document.getElementById('texture-progress');
        const statusText = document.getElementById('texture-status');
        const textureCanvas = document.getElementById('texture-canvas');
        
        if (generateBtn && promptInput && progressBar && statusText && textureCanvas) {
            generateBtn.addEventListener('click', () => {
                const prompt = promptInput.value.trim().toLowerCase();
                if (!prompt) return;
                
                generateBtn.disabled = true;
                promptInput.disabled = true;
                progressBar.style.width = '0%';
                
                let progress = 0;
                statusText.innerText = 'Initializing...';
                
                const steps = [
                    { p: 15, t: 'Connecting to neural model...' },
                    { p: 35, t: 'Synthesizing base map...' },
                    { p: 60, t: 'Generating normal & specular maps...' },
                    { p: 85, t: 'Applying microdetails...' },
                    { p: 100, t: 'Applying layer... Done!' }
                ];
                
                const interval = setInterval(() => {
                    progress += 4;
                    progressBar.style.width = progress + '%';
                    
                    // Update text based on current progress step
                    const step = steps.find(s => progress <= s.p) || steps[steps.length - 1];
                    statusText.innerText = step.t;
                    
                    if (progress >= 100) {
                        clearInterval(interval);
                        generateBtn.disabled = false;
                        promptInput.disabled = false;
                        
                        // Change background canvas to a procedural layout pattern matching prompt
                        if (prompt.includes('rust') || prompt.includes('iron') || prompt.includes('metal')) {
                            textureCanvas.style.background = 'repeating-conic-gradient(from 45deg, #7c3f30 0deg 90deg, #5c2d20 90deg 180deg)';
                            textureCanvas.style.backgroundSize = '20px 20px';
                        } else if (prompt.includes('wood') || prompt.includes('bark') || prompt.includes('tree')) {
                            textureCanvas.style.background = 'repeating-linear-gradient(90deg, #8b5a2b, #8b5a2b 8px, #5c3a21 8px, #5c3a21 16px)';
                        } else if (prompt.includes('skin') || prompt.includes('pore') || prompt.includes('face') || prompt.includes('flesh')) {
                            textureCanvas.style.background = '#e0a899';
                            textureCanvas.style.backgroundImage = 'radial-gradient(#b07869 1.5px, transparent 1.5px)';
                            textureCanvas.style.backgroundSize = '6px 6px';
                        } else {
                            // Default beautiful gradient pattern
                            textureCanvas.style.background = 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)';
                            textureCanvas.style.backgroundImage = 'radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent)';
                        }
                    }
                }, 60);
            });
        }
        
        // 4. Storyboard Splitter & AI Upscaler Simulator
        const sbImportBtn = document.getElementById('sb-import-btn');
        const sbDetectBtn = document.getElementById('sb-detect-btn');
        const sbUpscaleBtn = document.getElementById('sb-upscale-btn');
        const sbUpscalerSelect = document.getElementById('sb-upscaler-select');
        const sbSheetTitle = document.getElementById('sb-sheet-title');
        const sbStatusText = document.getElementById('sb-status-text');
        const sbScanline = document.getElementById('sb-scanline');
        const sbUpscaleBadge = document.getElementById('sb-upscale-badge');
        const sbPanels = document.querySelectorAll('.sb-panel');
        
        if (sbDetectBtn && sbUpscaleBtn && sbStatusText && sbScanline && sbPanels.length > 0) {
            const upscalerEngines = {
                'gemini-4x': { badge: "Gemini 4x Super-Res Active", status: "4x Super-Res: 4096×2304 (Google Imagen 3)", tag: "Gemini 4x" },
                'gemini-2x': { badge: "Gemini 2x Super-Res Active", status: "2x HD: 2048×1152 (Google Imagen 3)", tag: "Gemini 2x" },
                'comfy': { badge: "ComfyUI UltraSharp Active", status: "4x Neural Upscale: ComfyUI ESRGAN", tag: "ComfyUI" },
                'lanczos': { badge: "Offline Lanczos+Sharp Active", status: "Offline Super-Sampling (Lanczos-3)", tag: "Lanczos-3" }
            };

            let isDetected = false;
            let isUpscaled = false;

            if (sbImportBtn) {
                sbImportBtn.addEventListener('click', () => {
                    sbStatusText.innerText = 'Example Button: Active sheet loaded';
                });
            }

            if (sbUpscalerSelect) {
                sbUpscalerSelect.addEventListener('change', () => {
                    const engineKey = sbUpscalerSelect.value;
                    const engine = upscalerEngines[engineKey] || upscalerEngines['gemini-4x'];
                    if (isUpscaled) {
                        if (sbUpscaleBadge) {
                            sbUpscaleBadge.innerText = engine.badge;
                        }
                        sbStatusText.innerText = engine.status;
                    } else {
                        sbStatusText.innerText = `Engine: ${engine.tag}`;
                    }
                });
            }
            
            sbDetectBtn.addEventListener('click', () => {
                sbStatusText.innerText = 'Detecting OpenCV contours...';
                sbScanline.classList.remove('scanning');
                void sbScanline.offsetWidth;
                sbScanline.classList.add('scanning');
                
                setTimeout(() => {
                    isDetected = true;
                    sbPanels.forEach((p, idx) => {
                        setTimeout(() => {
                            p.classList.add('detected');
                        }, idx * 50);
                    });
                    sbStatusText.innerText = '6 Panels Sliced (#1–#6) | Reading Order';
                }, 350);
            });
            
            sbUpscaleBtn.addEventListener('click', () => {
                const engineKey = sbUpscalerSelect ? sbUpscalerSelect.value : 'gemini-4x';
                const engine = upscalerEngines[engineKey] || upscalerEngines['gemini-4x'];

                if (!isDetected) {
                    sbPanels.forEach(p => p.classList.add('detected'));
                    isDetected = true;
                }
                
                sbStatusText.innerText = `Upscaling via ${engine.tag}...`;
                
                setTimeout(() => {
                    isUpscaled = true;
                    sbPanels.forEach(p => {
                        p.classList.add('upscaled');
                    });
                    if (sbUpscaleBadge) {
                        sbUpscaleBadge.innerText = engine.badge;
                        sbUpscaleBadge.classList.add('active');
                    }
                    sbStatusText.innerText = engine.status;
                }, 400);
            });
            
            sbPanels.forEach(panel => {
                panel.addEventListener('click', () => {
                    sbPanels.forEach(p => p.classList.remove('selected'));
                    panel.classList.add('selected');
                    const num = panel.getAttribute('data-panel');
                    const note = panel.getAttribute('data-note') || '';
                    const engineKey = sbUpscalerSelect ? sbUpscalerSelect.value : 'gemini-4x';
                    const engine = upscalerEngines[engineKey] || upscalerEngines['gemini-4x'];
                    const state = isUpscaled ? `${engine.tag} Super-Res` : (isDetected ? 'Box Sliced' : 'Ready');
                    sbStatusText.innerText = `Panel #${num} "${note}": ${state}`;
                });
            });
        }
    }

    /* ==========================================================================
       Showreel Player Setup
       ========================================================================== */
    function initShowreel() {
        const reelPlayTrigger = document.getElementById('reel-play-trigger');
        if (reelPlayTrigger) {
            reelPlayTrigger.addEventListener('click', () => {
                reelPlayTrigger.innerHTML = `
                    <iframe src="https://player.vimeo.com/video/360443751?autoplay=1&muted=0" 
                            width="100%" 
                            height="100%" 
                            frameborder="0" 
                            allow="autoplay; fullscreen; picture-in-picture" 
                            allowfullscreen 
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;">
                    </iframe>
                `;
            });
        }
    }

    /* ==========================================================================
       Ambient Audio Player (Black Milk - Massive Attack)
       ========================================================================== */
    function initAmbientAudio() {
        const audioPlayers = document.querySelectorAll('.sidebar-audio-player, .mobile-audio-player');
        const playBtns = document.querySelectorAll('.audio-play-btn');
        const offBtns = document.querySelectorAll('.audio-off-btn');
        const audioInfos = document.querySelectorAll('.sidebar-audio-player .audio-info, .mobile-audio-player .audio-info');
        bgAudio = document.getElementById('bg-audio');

        if (!bgAudio) return;

        // Set default volume
        bgAudio.muted = false;
        bgAudio.volume = 0.45;

        function setAudioState(isPlaying) {
            audioPlaying = isPlaying;
            audioPlayers.forEach(player => {
                if (isPlaying) {
                    player.classList.add('is-playing');
                    player.classList.remove('is-muted');
                } else {
                    player.classList.remove('is-playing');
                    player.classList.add('is-muted');
                }
            });
            offBtns.forEach(btn => {
                btn.setAttribute('title', isPlaying ? 'Turn off audio' : 'Turn on audio');
                btn.setAttribute('aria-label', isPlaying ? 'Turn off audio' : 'Turn on audio');
            });
            playBtns.forEach(btn => {
                btn.setAttribute('title', isPlaying ? 'Pause Audio' : 'Play Audio');
                btn.setAttribute('aria-label', isPlaying ? 'Pause Audio' : 'Play Audio');
            });
        }

        // Strictly keep UI in sync with native HTML5 audio events
        bgAudio.addEventListener('playing', () => {
            setAudioState(true);
        });

        bgAudio.addEventListener('pause', () => {
            setAudioState(false);
        });

        bgAudio.addEventListener('ended', () => {
            setAudioState(false);
        });

        function playSound() {
            if (audioFadeInterval) clearInterval(audioFadeInterval);
            audioUserDisabled = false;
            bgAudio.muted = false;
            bgAudio.volume = 0.45;

            const playPromise = bgAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setAudioState(true);
                }).catch(err => {
                    console.log('Audio playback error:', err.message);
                    setAudioState(false);
                });
            }
        }

        function stopSound(isUserAction = false) {
            if (isUserAction) {
                audioUserDisabled = true;
            }
            if (audioFadeInterval) clearInterval(audioFadeInterval);
            
            let vol = bgAudio.volume;
            audioFadeInterval = setInterval(() => {
                vol -= 0.1;
                if (vol <= 0.05) {
                    bgAudio.volume = 0;
                    bgAudio.pause();
                    clearInterval(audioFadeInterval);
                    setAudioState(false);
                } else {
                    bgAudio.volume = vol;
                }
            }, 30);
        }

        function togglePlayPause(e) {
            if (e) e.stopPropagation();
            if (!bgAudio.paused) {
                stopSound(false);
            } else {
                audioUserDisabled = false;
                playSound();
            }
        }

        function toggleOffOn(e) {
            if (e) e.stopPropagation();
            if (!bgAudio.paused) {
                stopSound(true);
            } else {
                audioUserDisabled = false;
                playSound();
            }
        }

        playBtns.forEach(btn => {
            btn.addEventListener('click', togglePlayPause);
        });

        offBtns.forEach(btn => {
            btn.addEventListener('click', toggleOffOn);
        });

        audioInfos.forEach(info => {
            info.style.cursor = 'pointer';
            info.addEventListener('click', togglePlayPause);
        });

        // Initialize audio completely OFF by default
        audioUserDisabled = false;
        audioPlaying = false;
        setAudioState(false);
    }

    /* ==========================================================================
       Initial Bootstrapping
       ========================================================================== */
    function init() {
        // Load interactive Resume details
        renderTimeline();
        renderSkillsGrid();
        
        // Initialize DCC pipeline tools simulators
        initToolsSimulators();
        
        // Initialize Showreel Video
        initShowreel();
        
        // Initialize Ambient Audio Player
        initAmbientAudio();
        
        // Fetch ArtStation project details from consolidated JSON
        loadPortfolio();
        
        // Show Home section on default load
        navigateToSection('home');
    }
    
    init();
});
