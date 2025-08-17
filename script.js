class HabitFlow {
    constructor() {
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.completions = JSON.parse(localStorage.getItem('completions')) || {};
        this.journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        this.userStats = JSON.parse(localStorage.getItem('userStats')) || {
            totalPoints: 0,
            level: 1,
            experience: 0
        };
        this.achievements = JSON.parse(localStorage.getItem('achievements')) || [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.renderDashboard();
        this.renderAnalytics();
        this.renderJournal();
        this.renderAchievements();
        this.setupNotifications();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Add habit modal
        document.getElementById('addHabitBtn').addEventListener('click', () => {
            this.openAddHabitModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeAddHabitModal();
        });

        // Habit form
        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHabit();
        });

        // Habit type change
        document.getElementById('habitType').addEventListener('change', (e) => {
            this.toggleTargetGroup(e.target.value);
        });

        // Journal
        document.getElementById('saveJournalBtn').addEventListener('click', () => {
            this.saveJournalEntry();
        });

        // Close modal on outside click
        document.getElementById('addHabitModal').addEventListener('click', (e) => {
            if (e.target.id === 'addHabitModal') {
                this.closeAddHabitModal();
            }
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Render specific content
        switch(tabName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'journal':
                this.renderJournal();
                break;
            case 'achievements':
                this.renderAchievements();
                break;
        }
    }

    openAddHabitModal() {
        document.getElementById('addHabitModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeAddHabitModal() {
        document.getElementById('addHabitModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('habitForm').reset();
    }

    toggleTargetGroup(type) {
        const targetGroup = document.getElementById('targetGroup');
        const targetInput = document.getElementById('habitTarget');
        
        if (type === 'boolean') {
            targetGroup.style.display = 'none';
            targetInput.required = false;
        } else {
            targetGroup.style.display = 'block';
            targetInput.required = true;
            targetInput.placeholder = type === 'counter' ? 'e.g., 8 glasses' : 'e.g., 30 minutes';
        }
    }

    addHabit() {
        const formData = new FormData(document.getElementById('habitForm'));
        const habit = {
            id: Date.now().toString(),
            name: document.getElementById('habitName').value,
            type: document.getElementById('habitType').value,
            target: document.getElementById('habitTarget').value || 1,
            priority: document.getElementById('habitPriority').value,
            color: document.getElementById('habitColor').value,
            reminder: document.getElementById('habitReminder').value,
            createdAt: new Date().toISOString(),
            streak: 0,
            bestStreak: 0,
            totalCompletions: 0
        };

        this.habits.push(habit);
        this.saveData();
        this.closeAddHabitModal();
        this.renderDashboard();
        this.showToast('Habit created successfully!', 'success');
    }

    completeHabit(habitId, value = null) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const today = new Date().toISOString().split('T')[0];
        
        if (!this.completions[today]) {
            this.completions[today] = {};
        }

        // Handle different habit types
        let completed = false;
        switch (habit.type) {
            case 'boolean':
                this.completions[today][habitId] = true;
                completed = true;
                break;
            case 'counter':
                const currentCount = this.completions[today][habitId] || 0;
                const newCount = currentCount + (value || 1);
                this.completions[today][habitId] = newCount;
                completed = newCount >= habit.target;
                break;
            case 'timer':
                const currentTime = this.completions[today][habitId] || 0;
                const newTime = currentTime + (value || 1);
                this.completions[today][habitId] = newTime;
                completed = newTime >= habit.target;
                break;
        }

        if (completed) {
            this.updateStreak(habitId);
            this.addPoints(this.getHabitPoints(habit));
            this.showConfetti();
            this.showToast(`Great job! ${habit.name} completed!`, 'success');
            this.checkAchievements();
        }

        this.saveData();
        this.renderDashboard();
    }

    updateStreak(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Check if habit was completed yesterday
        const completedYesterday = this.completions[yesterdayStr] && 
                                 this.completions[yesterdayStr][habitId];

        if (completedYesterday || habit.streak === 0) {
            habit.streak += 1;
            habit.bestStreak = Math.max(habit.bestStreak, habit.streak);
        } else {
            habit.streak = 1;
        }

        habit.totalCompletions += 1;
    }

    getHabitPoints(habit) {
        const basePoints = 10;
        const priorityMultiplier = {
            low: 1,
            medium: 1.5,
            high: 2
        };
        const streakBonus = Math.floor(habit.streak / 7) * 5;
        
        return Math.floor(basePoints * priorityMultiplier[habit.priority] + streakBonus);
    }

    addPoints(points) {
        this.userStats.totalPoints += points;
        this.userStats.experience += points;
        
        // Level up logic
        const expNeeded = this.userStats.level * 100;
        if (this.userStats.experience >= expNeeded) {
            this.userStats.level += 1;
            this.userStats.experience = 0;
            this.showToast(`Level up! You're now level ${this.userStats.level}!`, 'success');
        }
    }

    renderDashboard() {
        this.renderStats();
        this.renderHabits();
        this.renderInsights();
    }

    renderStats() {
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = this.getThisWeekDates();
        
        // Active streaks
        const activeStreaks = this.habits.filter(h => h.streak > 0).length;
        document.getElementById('totalStreaks').textContent = activeStreaks;

        // Total points
        document.getElementById('totalPoints').textContent = this.userStats.totalPoints;

        // Completion rate this week
        const weeklyCompletions = thisWeek.map(date => {
            const dayCompletions = this.completions[date] || {};
            return this.habits.filter(habit => {
                const completion = dayCompletions[habit.id];
                return this.isHabitCompleted(habit, completion);
            }).length;
        });
        
        const totalPossible = this.habits.length * 7;
        const totalCompleted = weeklyCompletions.reduce((sum, count) => sum + count, 0);
        const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        document.getElementById('completionRate').textContent = `${completionRate}%`;

        // Time spent today
        const todayCompletions = this.completions[today] || {};
        const timeSpent = this.habits.reduce((total, habit) => {
            if (habit.type === 'timer' && todayCompletions[habit.id]) {
                return total + todayCompletions[habit.id];
            }
            return total;
        }, 0);
        document.getElementById('timeSpent').textContent = `${timeSpent}m`;
    }

    renderHabits() {
        const container = document.getElementById('habitsContainer');
        const today = new Date().toISOString().split('T')[0];
        const todayCompletions = this.completions[today] || {};

        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3>No habits yet</h3>
                    <p>Create your first habit to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            const completion = todayCompletions[habit.id];
            const isCompleted = this.isHabitCompleted(habit, completion);
            const progress = this.getHabitProgress(habit, completion);

            return `
                <div class="habit-card" style="border-left-color: ${habit.color}">
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-meta">
                            <div class="habit-streak">
                                <i class="fas fa-fire streak-flame"></i>
                                ${habit.streak} day streak
                            </div>
                            <div class="habit-priority priority-${habit.priority}">
                                <i class="fas fa-flag"></i>
                                ${habit.priority} priority
                            </div>
                        </div>
                    </div>
                    <div class="habit-actions">
                        ${this.renderHabitAction(habit, completion, isCompleted)}
                        ${this.renderHabitProgress(habit, progress)}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for habit actions
        container.querySelectorAll('.habit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const habitId = e.target.dataset.habitId;
                const value = e.target.dataset.value;
                this.completeHabit(habitId, value ? parseInt(value) : null);
            });
        });
    }

    renderHabitAction(habit, completion, isCompleted) {
        if (isCompleted) {
            return `
                <button class="habit-btn completed" disabled>
                    <i class="fas fa-check"></i>
                    Completed
                </button>
            `;
        }

        switch (habit.type) {
            case 'boolean':
                return `
                    <button class="habit-btn" data-habit-id="${habit.id}">
                        <i class="fas fa-check"></i>
                        Mark Done
                    </button>
                `;
            case 'counter':
                const current = completion || 0;
                return `
                    <button class="habit-btn" data-habit-id="${habit.id}" data-value="1">
                        <i class="fas fa-plus"></i>
                        ${current}/${habit.target}
                    </button>
                `;
            case 'timer':
                const currentTime = completion || 0;
                return `
                    <button class="habit-btn" data-habit-id="${habit.id}" data-value="15">
                        <i class="fas fa-clock"></i>
                        ${currentTime}/${habit.target}m
                    </button>
                `;
        }
    }

    renderHabitProgress(habit, progress) {
        return `
            <div class="progress-circle" style="background: conic-gradient(${habit.color} ${progress * 3.6}deg, var(--border-color) ${progress * 3.6}deg)">
                <div class="progress-text">${progress}%</div>
            </div>
        `;
    }

    isHabitCompleted(habit, completion) {
        if (!completion) return false;
        
        switch (habit.type) {
            case 'boolean':
                return completion === true;
            case 'counter':
            case 'timer':
                return completion >= habit.target;
            default:
                return false;
        }
    }

    getHabitProgress(habit, completion) {
        if (!completion) return 0;
        
        switch (habit.type) {
            case 'boolean':
                return completion ? 100 : 0;
            case 'counter':
            case 'timer':
                return Math.min(Math.round((completion / habit.target) * 100), 100);
            default:
                return 0;
        }
    }

    renderInsights() {
        const container = document.getElementById('insightsContainer');
        const insights = this.generateInsights();

        container.innerHTML = insights.map(insight => `
            <div class="insight-card">
                <h3>${insight.title}</h3>
                <p>${insight.description}</p>
            </div>
        `).join('');
    }

    generateInsights() {
        const insights = [];
        const thisWeek = this.getThisWeekDates();
        
        // Best day analysis
        const dayCompletions = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        thisWeek.forEach(date => {
            const dayOfWeek = new Date(date).getDay();
            const dayName = dayNames[dayOfWeek];
            const completions = this.completions[date] || {};
            const completedCount = Object.keys(completions).length;
            
            if (!dayCompletions[dayName]) {
                dayCompletions[dayName] = 0;
            }
            dayCompletions[dayName] += completedCount;
        });

        const bestDay = Object.keys(dayCompletions).reduce((a, b) => 
            dayCompletions[a] > dayCompletions[b] ? a : b
        );

        if (Object.keys(dayCompletions).length > 0) {
            insights.push({
                title: `Your best day: ${bestDay}`,
                description: `You tend to complete more habits on ${bestDay}s. Try scheduling important habits on this day!`
            });
        }

        // Streak insights
        const longestStreak = Math.max(...this.habits.map(h => h.bestStreak), 0);
        if (longestStreak > 0) {
            insights.push({
                title: `Longest streak: ${longestStreak} days`,
                description: `You've shown great consistency! Keep building those habits one day at a time.`
            });
        }

        // Consistency insights
        const totalHabits = this.habits.length;
        const activeStreaks = this.habits.filter(h => h.streak > 0).length;
        
        if (totalHabits > 0) {
            const consistencyRate = Math.round((activeStreaks / totalHabits) * 100);
            insights.push({
                title: `${consistencyRate}% consistency rate`,
                description: `You're maintaining ${activeStreaks} out of ${totalHabits} habits. ${consistencyRate >= 70 ? 'Excellent work!' : 'Keep pushing forward!'}`
            });
        }

        return insights.length > 0 ? insights : [{
            title: 'Start your journey',
            description: 'Add some habits and start tracking to see personalized insights here!'
        }];
    }

    renderAnalytics() {
        this.renderProgressChart();
        this.renderHeatmap();
    }

    renderProgressChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const last30Days = this.getLast30Days();
        
        const data = last30Days.map(date => {
            const dayCompletions = this.completions[date] || {};
            return this.habits.filter(habit => {
                const completion = dayCompletions[habit.id];
                return this.isHabitCompleted(habit, completion);
            }).length;
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(date => new Date(date).toLocaleDateString()),
                datasets: [{
                    label: 'Habits Completed',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        const last90Days = this.getLast90Days();
        
        const heatmapData = last90Days.map(date => {
            const dayCompletions = this.completions[date] || {};
            const completedCount = this.habits.filter(habit => {
                const completion = dayCompletions[habit.id];
                return this.isHabitCompleted(habit, completion);
            }).length;
            
            const totalHabits = this.habits.length;
            const intensity = totalHabits > 0 ? Math.ceil((completedCount / totalHabits) * 4) : 0;
            
            return {
                date,
                intensity: Math.min(intensity, 4)
            };
        });

        container.innerHTML = `
            <h3>Activity Heatmap (Last 90 days)</h3>
            <div class="heatmap-grid">
                ${heatmapData.map(day => `
                    <div class="heatmap-cell ${day.intensity > 0 ? `level-${day.intensity}` : ''}" 
                         title="${day.date}">
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderJournal() {
        this.renderJournalEntries();
    }

    saveJournalEntry() {
        const text = document.getElementById('journalText').value.trim();
        if (!text) return;

        const entry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            text: text,
            habits: this.getTodayHabitsStatus()
        };

        this.journalEntries.unshift(entry);
        this.saveData();
        
        document.getElementById('journalText').value = '';
        this.renderJournalEntries();
        this.showToast('Journal entry saved!', 'success');
    }

    getTodayHabitsStatus() {
        const today = new Date().toISOString().split('T')[0];
        const todayCompletions = this.completions[today] || {};
        
        return this.habits.map(habit => ({
            name: habit.name,
            completed: this.isHabitCompleted(habit, todayCompletions[habit.id])
        }));
    }

    renderJournalEntries() {
        const container = document.getElementById('journalEntries');
        
        if (this.journalEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3>No journal entries yet</h3>
                    <p>Start reflecting on your habit journey!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.journalEntries.map(entry => `
            <div class="journal-entry-card">
                <div class="journal-date">
                    ${new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
                <p>${entry.text}</p>
                ${entry.habits ? `
                    <div class="journal-habits">
                        <small>Habits that day: ${entry.habits.filter(h => h.completed).length}/${entry.habits.length} completed</small>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderAchievements() {
        this.updateUserLevel();
        this.renderAchievementsList();
    }

    updateUserLevel() {
        const levels = [
            { name: 'Beginner', minXP: 0 },
            { name: 'Consistent', minXP: 500 },
            { name: 'Dedicated', minXP: 1500 },
            { name: 'Master', minXP: 3000 },
            { name: 'Legend', minXP: 5000 }
        ];

        const currentLevel = levels.reverse().find(level => 
            this.userStats.totalPoints >= level.minXP
        ) || levels[levels.length - 1];

        const nextLevel = levels.find(level => 
            this.userStats.totalPoints < level.minXP
        );

        document.getElementById('userLevel').textContent = currentLevel.name;
        
        if (nextLevel) {
            const progress = ((this.userStats.totalPoints - currentLevel.minXP) / 
                            (nextLevel.minXP - currentLevel.minXP)) * 100;
            document.getElementById('levelFill').style.width = `${progress}%`;
            document.getElementById('levelText').textContent = 
                `${this.userStats.totalPoints} / ${nextLevel.minXP} XP`;
        } else {
            document.getElementById('levelFill').style.width = '100%';
            document.getElementById('levelText').textContent = 'Max Level!';
        }
    }

    renderAchievementsList() {
        const container = document.getElementById('achievementsGrid');
        const achievements = this.getAllAchievements();

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
                ${achievement.unlocked ? `
                    <div class="achievement-date">
                        Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    getAllAchievements() {
        const achievements = [
            {
                id: 'first_habit',
                title: 'First Step',
                description: 'Create your first habit',
                icon: 'fas fa-seedling',
                condition: () => this.habits.length >= 1
            },
            {
                id: 'week_streak',
                title: 'Week Warrior',
                description: 'Maintain a 7-day streak',
                icon: 'fas fa-fire',
                condition: () => this.habits.some(h => h.bestStreak >= 7)
            },
            {
                id: 'month_streak',
                title: 'Monthly Master',
                description: 'Maintain a 30-day streak',
                icon: 'fas fa-crown',
                condition: () => this.habits.some(h => h.bestStreak >= 30)
            },
            {
                id: 'hundred_completions',
                title: 'Century Club',
                description: 'Complete 100 habits',
                icon: 'fas fa-medal',
                condition: () => this.habits.reduce((sum, h) => sum + h.totalCompletions, 0) >= 100
            },
            {
                id: 'five_habits',
                title: 'Habit Collector',
                description: 'Create 5 different habits',
                icon: 'fas fa-collection',
                condition: () => this.habits.length >= 5
            },
            {
                id: 'perfect_week',
                title: 'Perfect Week',
                description: 'Complete all habits for 7 days straight',
                icon: 'fas fa-star',
                condition: () => this.checkPerfectWeek()
            }
        ];

        return achievements.map(achievement => {
            const unlocked = this.achievements.find(a => a.id === achievement.id);
            return {
                ...achievement,
                unlocked: !!unlocked,
                unlockedAt: unlocked?.unlockedAt
            };
        });
    }

    checkAchievements() {
        const achievements = this.getAllAchievements();
        
        achievements.forEach(achievement => {
            if (!achievement.unlocked && achievement.condition()) {
                this.unlockAchievement(achievement);
            }
        });
    }

    unlockAchievement(achievement) {
        this.achievements.push({
            id: achievement.id,
            unlockedAt: new Date().toISOString()
        });
        
        this.saveData();
        this.showToast(`Achievement unlocked: ${achievement.title}!`, 'success');
        this.showConfetti();
    }

    checkPerfectWeek() {
        const last7Days = this.getLast7Days();
        
        return last7Days.every(date => {
            const dayCompletions = this.completions[date] || {};
            return this.habits.every(habit => {
                const completion = dayCompletions[habit.id];
                return this.isHabitCompleted(habit, completion);
            });
        });
    }

    setupNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            Notification.requestPermission();
        }
        
        // Check for habit reminders every minute
        setInterval(() => {
            this.checkReminders();
        }, 60000);
    }

    checkReminders() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];
        const todayCompletions = this.completions[today] || {};

        this.habits.forEach(habit => {
            if (habit.reminder === currentTime && !this.isHabitCompleted(habit, todayCompletions[habit.id])) {
                this.showNotification(habit);
            }
        });
    }

    showNotification(habit) {
        if (Notification.permission === 'granted') {
            new Notification(`Time for: ${habit.name}`, {
                body: 'Don\'t forget to complete your habit!',
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png'
            });
        }
    }

    showConfetti() {
        const container = document.getElementById('confettiContainer');
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#fbbf24'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            
            container.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

        // Utility functions
    getThisWeekDates() {
        const dates = [];
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return dates;
    }

    getLast7Days() {
        const dates = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return dates;
    }

    getLast30Days() {
        const dates = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return dates;
    }

    getLast90Days() {
        const dates = [];
        const today = new Date();
        
        for (let i = 89; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        return dates;
    }

    saveData() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
        localStorage.setItem('completions', JSON.stringify(this.completions));
        localStorage.setItem('journalEntries', JSON.stringify(this.journalEntries));
        localStorage.setItem('userStats', JSON.stringify(this.userStats));
        localStorage.setItem('achievements', JSON.stringify(this.achievements));
    }

    // Export data for sharing
    exportProgress() {
        const data = {
            habits: this.habits,
            completions: this.completions,
            userStats: this.userStats,
            achievements: this.achievements,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `habitflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully!', 'success');
    }

    // Import data
    importProgress(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all your current data. Are you sure?')) {
                    this.habits = data.habits || [];
                    this.completions = data.completions || {};
                    this.userStats = data.userStats || { totalPoints: 0, level: 1, experience: 0 };
                    this.achievements = data.achievements || [];
                    
                    this.saveData();
                    this.renderDashboard();
                    this.showToast('Data imported successfully!', 'success');
                }
            } catch (error) {
                this.showToast('Invalid file format!', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Reset all data
    resetAllData() {
        if (confirm('This will delete all your habits, progress, and data. This cannot be undone. Are you sure?')) {
            if (confirm('Really sure? This action is permanent!')) {
                localStorage.clear();
                location.reload();
            }
        }
    }

    // Generate shareable progress card
    generateProgressCard() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Title
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HabitFlow Progress', 400, 80);

        // Stats
        ctx.font = '24px Arial';
        const stats = [
            `Total Points: ${this.userStats.totalPoints}`,
            `Active Streaks: ${this.habits.filter(h => h.streak > 0).length}`,
            `Total Habits: ${this.habits.length}`,
            `Best Streak: ${Math.max(...this.habits.map(h => h.bestStreak), 0)} days`
        ];

        stats.forEach((stat, index) => {
            ctx.fillText(stat, 400, 180 + (index * 60));
        });

        // Date
        ctx.font = '18px Arial';
        ctx.fillText(new Date().toLocaleDateString(), 400, 500);

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `habitflow-progress-${new Date().toISOString().split('T')[0]}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });

        this.showToast('Progress card generated!', 'success');
    }
}

// Enhanced features and utilities
class HabitFlowEnhanced extends HabitFlow {
    constructor() {
        super();
        this.setupAdvancedFeatures();
    }

    setupAdvancedFeatures() {
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
        this.setupAdvancedAnalytics();
        this.setupHabitTemplates();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: New habit
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openAddHabitModal();
            }
            
            // Ctrl/Cmd + J: Open journal
            if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
                e.preventDefault();
                this.switchTab('journal');
                document.getElementById('journalText').focus();
            }
            
            // Escape: Close modal
            if (e.key === 'Escape') {
                this.closeAddHabitModal();
            }
            
            // Number keys 1-4: Switch tabs
            if (e.key >= '1' && e.key <= '4' && !e.target.matches('input, textarea')) {
                const tabs = ['dashboard', 'analytics', 'journal', 'achievements'];
                this.switchTab(tabs[parseInt(e.key) - 1]);
            }
        });
    }

    setupDragAndDrop() {
        // Allow reordering habits by drag and drop
        let draggedElement = null;

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('habit-card')) {
                draggedElement = e.target;
                e.target.style.opacity = '0.5';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('habit-card')) {
                e.target.style.opacity = '1';
                draggedElement = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement && e.target.classList.contains('habit-card')) {
                // Reorder habits logic here
                this.reorderHabits(draggedElement, e.target);
            }
        });
    }

    setupAdvancedAnalytics() {
        // Add more detailed analytics
        this.analytics = {
            getHabitCorrelations: () => {
                // Analyze which habits are often completed together
                const correlations = {};
                // Implementation here
                return correlations;
            },
            
            getPredictiveInsights: () => {
                // Predict which habits user might struggle with
                const predictions = [];
                // Implementation here
                return predictions;
            },
            
            getOptimalTiming: () => {
                // Suggest best times for habits based on completion patterns
                const timing = {};
                // Implementation here
                return timing;
            }
        };
    }

    setupHabitTemplates() {
        this.templates = [
            {
                name: 'Morning Routine',
                habits: [
                    { name: 'Drink water', type: 'counter', target: 2, priority: 'high' },
                    { name: 'Meditate', type: 'timer', target: 10, priority: 'medium' },
                    { name: 'Exercise', type: 'timer', target: 30, priority: 'high' }
                ]
            },
            {
                name: 'Evening Wind-down',
                habits: [
                    { name: 'Read', type: 'timer', target: 20, priority: 'medium' },
                    { name: 'Journal', type: 'boolean', priority: 'low' },
                    { name: 'No screens 1hr before bed', type: 'boolean', priority: 'high' }
                ]
            },
            {
                name: 'Health & Fitness',
                habits: [
                    { name: 'Drink 8 glasses of water', type: 'counter', target: 8, priority: 'high' },
                    { name: 'Take vitamins', type: 'boolean', priority: 'medium' },
                    { name: 'Walk 10,000 steps', type: 'counter', target: 10000, priority: 'high' },
                    { name: 'Eat vegetables', type: 'counter', target: 5, priority: 'medium' }
                ]
            }
        ];
    }

    // Advanced habit management
    duplicateHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const newHabit = {
            ...habit,
            id: Date.now().toString(),
            name: `${habit.name} (Copy)`,
            streak: 0,
            bestStreak: 0,
            totalCompletions: 0,
            createdAt: new Date().toISOString()
        };

        this.habits.push(newHabit);
        this.saveData();
        this.renderDashboard();
        this.showToast('Habit duplicated!', 'success');
    }

    archiveHabit(habitId) {
        const habitIndex = this.habits.findIndex(h => h.id === habitId);
        if (habitIndex === -1) return;

        const habit = this.habits[habitIndex];
        habit.archived = true;
        habit.archivedAt = new Date().toISOString();

        this.saveData();
        this.renderDashboard();
        this.showToast(`${habit.name} archived`, 'success');
    }

    deleteHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit? This cannot be undone.')) {
            return;
        }

        this.habits = this.habits.filter(h => h.id !== habitId);
        
        // Clean up completions
        Object.keys(this.completions).forEach(date => {
            delete this.completions[date][habitId];
        });

        this.saveData();
        this.renderDashboard();
        this.showToast('Habit deleted', 'success');
    }

    // Habit suggestions based on user patterns
    suggestHabits() {
        const suggestions = [];
        
        // Analyze current habits and suggest complementary ones
        const hasExercise = this.habits.some(h => 
            h.name.toLowerCase().includes('exercise') || 
            h.name.toLowerCase().includes('workout')
        );
        
        const hasWater = this.habits.some(h => 
            h.name.toLowerCase().includes('water')
        );
        
        const hasMeditation = this.habits.some(h => 
            h.name.toLowerCase().includes('meditat')
        );

        if (!hasWater) {
            suggestions.push({
                name: 'Drink 8 glasses of water',
                type: 'counter',
                target: 8,
                reason: 'Hydration is fundamental for health and energy'
            });
        }

        if (!hasMeditation) {
            suggestions.push({
                name: 'Meditate for 10 minutes',
                type: 'timer',
                target: 10,
                reason: 'Meditation can improve focus and reduce stress'
            });
        }

        if (!hasExercise) {
            suggestions.push({
                name: 'Exercise for 30 minutes',
                type: 'timer',
                target: 30,
                reason: 'Regular exercise boosts mood and energy levels'
            });
        }

        return suggestions;
    }

    // Social features (if implemented)
    shareProgress() {
        if (navigator.share) {
            const activeStreaks = this.habits.filter(h => h.streak > 0).length;
            const longestStreak = Math.max(...this.habits.map(h => h.bestStreak), 0);
            
            navigator.share({
                title: 'My HabitFlow Progress',
                text: `I'm building consistency with HabitFlow! 🔥 ${activeStreaks} active streaks, longest streak: ${longestStreak} days. Join me in building better habits!`,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            const text = `I'm building consistency with HabitFlow! 🔥 ${this.habits.filter(h => h.streak > 0).length} active streaks. Check it out!`;
            navigator.clipboard.writeText(text);
            this.showToast('Progress copied to clipboard!', 'success');
        }
    }

    // Backup and sync features
    createBackup() {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                habits: this.habits,
                completions: this.completions,
                journalEntries: this.journalEntries,
                userStats: this.userStats,
                achievements: this.achievements
            }
        };

        return backup;
    }

    restoreFromBackup(backup) {
        try {
            if (backup.version && backup.data) {
                this.habits = backup.data.habits || [];
                this.completions = backup.data.completions || {};
                this.journalEntries = backup.data.journalEntries || [];
                this.userStats = backup.data.userStats || { totalPoints: 0, level: 1, experience: 0 };
                this.achievements = backup.data.achievements || [];
                
                this.saveData();
                this.renderDashboard();
                this.showToast('Backup restored successfully!', 'success');
                return true;
            }
        } catch (error) {
            this.showToast('Failed to restore backup', 'error');
            return false;
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.habitFlow = new HabitFlowEnhanced();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Add some utility functions for better UX
const utils = {
    formatTime: (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    formatDate: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    },

    getMotivationalMessage: (streak) => {
        if (streak === 0) return "Every journey begins with a single step! 🌱";
        if (streak < 7) return "You're building momentum! Keep going! 💪";
        if (streak < 30) return "Amazing consistency! You're on fire! 🔥";
        if (streak < 100) return "Incredible dedication! You're a habit master! 🏆";
        return "Legendary consistency! You're an inspiration! 👑";
    },

    generateHabitId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export utils to global scope
window.habitFlowUtils = utils;
