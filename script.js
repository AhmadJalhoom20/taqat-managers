const firebaseConfig = {
    apiKey: "AIzaSyBT46o912H6dZqQWvamf3wJ7uSm86AyVU8",
    authDomain: "tjchat-managers-f4ba5.firebaseapp.com",
    databaseURL: "https://tjchat-managers-f4ba5-default-rtdb.firebaseio.com",
    projectId: "tjchat-managers-f4ba5",
    storageBucket: "tjchat-managers-f4ba5.firebasestorage.app",
    messagingSenderId: "108054725102",
    appId: "1:108054725102:web:17bcbccbc7f3f90ce48eff"
  };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

let currentUser = null;
let currentChat = null;
let currentChatType = null; 
let messagesListener = null;
let currentGroup = "عام";
let resetbtn = document.getElementById("resetbtn");
const authContainer = document.getElementById('authContainer');
const chatContainer = document.getElementById('chatContainer');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatHeader = document.getElementById('chatHeader');
const groupsList = document.getElementById('groupsList');
const usersList = document.getElementById('usersList');
const groupsSidebar = document.getElementById('groupsSidebar');
const usersSidebar = document.getElementById('usersSidebar');
const groupsToggle = document.getElementById('groupsToggle');
const usersToggle = document.getElementById('usersToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
let signupBtn = document.getElementById("signupBtn");
let resetSection = document.getElementById("resetSection")
let loginSection = document.getElementById("authContainer")
const userRoleCache = new Map();
const joinRequestCache = new Map();
const groupMembersCache = new Map();


// متغيرات جديدة للميزات المحسنة
let groupsListener = null;
let joinRequestsListener = null;
let friendRequestsListener = null;
let unreadCountListeners = {};
let currentGroupInfo = null;
let loadedGroups = new Set(); // لتجنب التكرار

// عناصر المودال
const openModalBtn = document.getElementById('openModalBtn');
const modal = document.getElementById('attendanceModal');
const closeModall = document.getElementById('close');
const attendanceBtn = document.getElementById('attendanceBtn');
const status = document.getElementById('attendanceStatus');

// فتح وإغلاق المودال
openModalBtn.onclick = function() { modal.style.display = 'block'; };
closeModall.onclick = function() { modal.style.display = 'none'; };
window.onclick = function(e) { if(e.target == modal) modal.style.display = 'none'; };

// دالة تسجيل الحضور والتحقق من اليوم
attendanceBtn.onclick = function() {
  const user = auth.currentUser;
  if(!user){
    status.textContent = "❌ يجب تسجيل الدخول أولاً";
    return;
  }

  const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const attendanceCollection = db.collection("attendance");

  // تحقق إذا المستخدم سجل اليوم
  const docRef = attendanceCollection.doc(user.uid);
  docRef.get().then(function(docSnap) {
    if(docSnap.exists && docSnap.data().date === today){
      attendanceBtn.disabled = true;
      attendanceBtn.textContent = "✅ أنت مسجل بالفعل، عد غداً";
      status.textContent = "";
    } else {
      // حذف كل المستندات القديمة
      attendanceCollection.get().then(function(snapshot){
        snapshot.forEach(function(docItem){
          attendanceCollection.doc(docItem.id).delete();
        });

        // تسجيل الحضور اليومي
        docRef.set({
          name: user.displayName || "لا يوجد اسم",
          email: user.email || "لا يوجد إيميل",
          date: today,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){
          attendanceBtn.disabled = true;
          attendanceBtn.textContent = "✅ أنت مسجل بالفعل، عد غداً";
          status.textContent = `🎉 تم تسجيل حضور ${user.displayName || "المستخدم"} بنجاح!`;
        });
      });
    }
  });
};

// تحقق عند تحميل الصفحة إذا سجل المستخدم اليوم
window.onload = function(){
  const user = auth.currentUser;
  if(!user) return;

  const today = new Date().toISOString().slice(0,10);
  const docRef = db.collection("attendance").doc(user.uid);
  docRef.get().then(function(docSnap){
    if(docSnap.exists && docSnap.data().date === today){
      attendanceBtn.disabled = true;
      attendanceBtn.textContent = "✅ أنت مسجل بالفعل، عد غداً";
    } else {
      attendanceBtn.disabled = false;
      attendanceBtn.textContent = "سجل حضوري الآن";
    }
  });
};





// نظام البحث عن المستخدمين
const searchContainer = document.createElement('div');
searchContainer.innerHTML = `
    <div id="searchModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; width: 90%; max-width: 500px;">
            <h3>البحث عن مستخدمين</h3>
            <input type="text" id="searchInput" placeholder="ابحث بالاسم أو البريد الإلكتروني..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
            <div id="searchResults" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;"></div>
            <button onclick="closeSearchModal()" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إغلاق</button>
        </div>
    </div>
`;
document.body.appendChild(searchContainer);

// نظام طلبات الصداقة
const friendRequestsContainer = document.createElement('div');
friendRequestsContainer.innerHTML = `
    <div id="friendRequestsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; width: 90%; max-width: 500px;">
            <h3>طلبات الصداقة</h3>
            <div id="friendRequestsList" style="max-height: 400px; overflow-y: auto; margin: 15px 0;"></div>
            <button onclick="closeFriendRequestsModal()" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إغلاق</button>
        </div>
    </div>
`;
document.body.appendChild(friendRequestsContainer);

// نظام أعضاء المجموعة
const groupMembersContainer = document.createElement('div');
groupMembersContainer.innerHTML = `
    <div id="groupMembersModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; width: 90%; max-width: 600px;">
            <h3>أعضاء المجموعة</h3>
            <div id="groupMembersList" style="max-height: 400px; overflow-y: auto; margin: 15px 0;"></div>
            <button onclick="closeGroupMembersModal()" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إغلاق</button>
        </div>
    </div>
`;
document.body.appendChild(groupMembersContainer);

// نظام دعوة المستخدمين للمجموعة
const inviteUsersContainer = document.createElement('div');
inviteUsersContainer.innerHTML = `
    <div id="inviteUsersModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; width: 90%; max-width: 600px;">
            <h3>دعوة مستخدمين للمجموعة</h3>
            <input type="text" id="inviteSearchInput" placeholder="ابحث بالاسم أو البريد الإلكتروني..." style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
            <div id="inviteUsersList" style="max-height: 400px; overflow-y: auto; margin: 15px 0; border: 1px solid #ddd; border-radius: 5px;"></div>
            <button onclick="closeInviteUsersModal()" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إغلاق</button>
        </div>
    </div>
`;
document.body.appendChild(inviteUsersContainer);

// إضافة أزرار البحث وطلبات الصداقة
const searchBtn = document.createElement('button');
searchBtn.innerHTML = '🔍 بحث';
searchBtn.style.cssText = 'margin: 5px; padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;';
searchBtn.onclick = openSearchModal;

const friendRequestsBtn = document.createElement('button');
friendRequestsBtn.innerHTML = '👥 طلبات الصداقة';
friendRequestsBtn.id = 'friendRequestsBtn';
friendRequestsBtn.style.cssText = 'margin: 5px; padding: 8px 12px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;';
friendRequestsBtn.onclick = openFriendRequestsModal;

// إضافة الأزرار للواجهة
if (usersSidebar && usersList && usersSidebar.contains(usersList)) {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'padding: 10px; border-bottom: 1px solid #ddd;';
    buttonsContainer.appendChild(searchBtn);
    buttonsContainer.appendChild(friendRequestsBtn);

    usersSidebar.insertBefore(buttonsContainer, usersList);
}


const googleSignInBtn = document.getElementById("googleSignInBtn");

googleSignInBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;

            const userRef = firebase.firestore().collection("users").doc(user.uid);

            userRef.get().then((doc) => {
                if (!doc.exists) {
                    userRef.set({
                        username: user.displayName || "مستخدم",
                        email: user.email,
                        verified: false
                    });
                }
            });

            document.getElementById("authContainer").style.display = "none";
            document.getElementById("chatContainer").style.display = "flex";
            document.getElementById("userEmail").textContent = user.email;
        })
        .catch((error) => {
            console.error("خطأ في تسجيل الدخول باستخدام Google:", error.message);
            alert("فشل تسجيل الدخول بحساب Google");
        });
});

function toggleSidebar(sidebar, overlay = true) {
    const isOpen = sidebar.classList.contains('open');
    
    groupsSidebar.classList.remove('open');

    sidebarOverlay.classList.remove('show');
    
    if (!isOpen) {
        sidebar.classList.add('open');
        if (overlay) {
            sidebarOverlay.classList.add('show');
        }
    }
}

groupsToggle.addEventListener('click', () => {
    toggleSidebar(groupsSidebar);
});



sidebarOverlay.addEventListener('click', () => {
    groupsSidebar.classList.remove('open');
 
    sidebarOverlay.classList.remove('show');
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        groupsSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }
});

resetbtn.addEventListener("click", function () {
  resetSection.style.display = "none";
  loginSection.style.display = "block";
});

document.getElementById("Resetpas").addEventListener("click", function () {
  loginSection.style.display = "none";
  resetSection.style.display = "block";
});

const statusRef = rtdb.ref('usersStatus');
const onlineList = document.getElementById("onlineUsers");
const offlineList = document.getElementById("offlineUsers");

statusRef.on('value', async (snapshot) => {
  const usersStatus = snapshot.val();

  for (const uid in usersStatus) {
    const userStatus = usersStatus[uid];

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data();
      const userName = userData?.name || userData?.email || "مستخدم";

      const li = document.createElement("li");
      li.innerHTML = `${userStatus.state === "online" ? "🟢" : "🔴"} ${userName}`;

      
    } catch (error) {
      console.error(error)
    }
  }
});





// متغير لمراقبة حالة المستخدم الحالية
let currentAuthState = null;

function setupGroupListeners(groupId) {
    console.clear()
}

function renderGroupUI(groupId) {
    console.clear()
}

auth.onAuthStateChanged((user) => {
    if (user) {
        // حفظ حالة تسجيل الدخول في localStorage
        localStorage.setItem('isLoggedIn', 'true');
        
        currentUser = user;
        userEmail.textContent = user.email;
        authContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
                initializeMentionSystem();
        // تنظيف المستمعين السابقين قبل إعداد الجدد
        if (groupsListener) {
            groupsListener();
            groupsListener = null;
        }
        if (joinRequestsListener) {
            joinRequestsListener();
            joinRequestsListener = null;
        }
        if (friendRequestsListener) {
            friendRequestsListener();
            friendRequestsListener = null;
        }
        
        // إعداد جديد
        loadFriends();
        loadUsers();
        setupRealtimeGroupUpdates();
        setupFriendRequestsListener();
        setupUnreadCountListeners();
        
        setTimeout(() => {
            const generalGroup = document.querySelector('[data-group="عام"]');
            if (generalGroup) {
                generalGroup.classList.add('active');
                loadGroupChat('عام');
            }
            const userStatusRef = rtdb.ref('/usersStatus/' + user.uid);
            userStatusRef.set({
                state: 'online',
                last_changed: firebase.database.ServerValue.TIMESTAMP
            });
            userStatusRef.onDisconnect().set({
                state: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP
            });
        }, 30);
        
    } else {
        // إزالة حالة تسجيل الدخول من localStorage
        localStorage.removeItem('isLoggedIn');
        
        currentUser = null;
        friends.clear();
        renderFriends();
        authContainer.style.display = 'flex';
        chatContainer.style.display = 'none';
        cleanupMentionSystem();
        // إيقاف جميع المستمعين
        if (groupsListener) {
            groupsListener();
            groupsListener = null;
        }
        if (joinRequestsListener) {
            joinRequestsListener();
            joinRequestsListener = null;
        }
        if (friendRequestsListener) {
            friendRequestsListener();
            friendRequestsListener = null;
        }

        
// افترض أن currentUser موجود بالفعل
const mentionsPopup = document.createElement('div');
mentionsPopup.style.position = 'fixed';
mentionsPopup.style.bottom = '20px';
mentionsPopup.style.right = '20px';
mentionsPopup.style.background = '#e74c3c';
mentionsPopup.style.color = 'white';
mentionsPopup.style.padding = '10px 15px';
mentionsPopup.style.borderRadius = '8px';
mentionsPopup.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
mentionsPopup.style.display = 'none';
mentionsPopup.style.zIndex = '1000';
document.body.appendChild(mentionsPopup);




        db.collection('mentions')
  .where('userId', '==', currentUser.uid)
  .where('read', '==', false)
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        // عرض Popup
        mentionsPopup.textContent = `💬 ${data.senderName} منشنك: "${data.message}"`;
        mentionsPopup.style.display = 'block';
        setTimeout(() => {
          mentionsPopup.style.display = 'none';
        }, 5000); // يختفي بعد 5 ثواني

        // تحديث الـ read لمنع تكرار الإشعار
        change.doc.ref.update({ read: true });
      }
    });
  });

// مستمع على قبول طلب الانضمام





        
        // إيقاف مستمعي عدادات الرسائل
        Object.values(unreadCountListeners).forEach(listener => listener());
        unreadCountListeners = {};
        friends.clear();
        loadedGroups.clear(); // تنظيف المجموعات المحملة
    }

// مستمع على حالة الانضمام للقروب
// مستمع على حالة الانضمام للقروب
db.collection('joinRequests')
  .where('userId', '==', currentUser.uid)
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'modified' && data.status === 'accepted') {
        const currentGroupId = data.groupId;

        // إزالة أي رسالة "أنت لست عضواً"
        document.querySelectorAll('.notMemberMessage').forEach(div => div.remove());

        // إعادة تهيئة القروب كما لو دخلت للتو
        loadGroupChat(currentGroupId);
        setupGroupListeners(currentGroupId);
        renderGroupUI(currentGroupId);

     


        // اختفاء الرسالة بعد 10 ثواني
        setTimeout(() => acceptedDiv.remove(), 10000);
      }
    });
  });


    
    
    checkLoginStatus();
});

// نظام البحث عن المستخدمين
function openSearchModal() {
    document.getElementById('searchModal').style.display = 'block';
    document.getElementById('searchInput').focus();
}

function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

// البحث الذكي
document.getElementById('searchInput').addEventListener('input', async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">اكتب على الأقل حرفين للبحث</p>';
        return;
    }

    resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center;">جاري البحث...</p>';

    try {
        // جلب كل المستخدمين (يمكن تحسينه لاحقاً بفلترة من السيرفر لو البيانات كبيرة)
        const usersSnapshot = await db.collection('users').get();

        const users = new Map();

        usersSnapshot.docs.forEach(doc => {
            if (doc.id !== currentUser.uid) {
                const userData = doc.data();
                const name = (userData.name || '').toLowerCase();
                const email = (userData.email || '').toLowerCase();

                if (name.includes(searchTerm) || email.includes(searchTerm)) {
                    users.set(doc.id, { id: doc.id, ...userData });
                }
            }
        });

        if (users.size === 0) {
            resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">لم يتم العثور على مستخدمين</p>';
            return;
        }

        const usersArray = Array.from(users.entries());

        // استعلامات طلبات الصداقة المعلقة تتم بالتوازي
        const pendingRequestsPromises = usersArray.map(([userId]) =>
            db.collection('friendRequests')
              .where('senderId', '==', currentUser.uid)
              .where('receiverId', '==', userId)
              .where('status', '==', 'pending')
              .get()
        );

        const pendingRequestsSnapshots = await Promise.all(pendingRequestsPromises);

        resultsContainer.innerHTML = '';

        for (let i = 0; i < usersArray.length; i++) {
            const [userId, userData] = usersArray[i];
            const pendingRequestSnapshot = pendingRequestsSnapshots[i];

            const isFriend = friends.has(userId);
            const hasPendingRequest = !pendingRequestSnapshot.empty;

            const userDiv = document.createElement('div');
            userDiv.style.cssText = `
                padding: 15px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f9f9f9;
                margin: 5px 0;
                border-radius: 8px;
            `;

            let buttonHtml = '';
            if (isFriend) {
                buttonHtml = '<span style="color: green; font-weight: bold;">✓ صديق</span>';
            } else if (hasPendingRequest) {
                buttonHtml = '<span style="color: orange;">⏳ تم الإرسال</span>';
            } else {
                buttonHtml = `<button onclick="sendFriendRequest('${userId}')" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">➕ إضافة</button>`;
            }

            userDiv.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #333;">${userData.name || 'مستخدم'}</div>
                    <div style="color: #666; font-size: 14px;">${userData.email}</div>
                </div>
                <div>${buttonHtml}</div>
            `;

            resultsContainer.appendChild(userDiv);
        }

    } catch (error) {
        console.error('خطأ في البحث:', error);
        resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #f44336;">حدث خطأ أثناء البحث</p>';
    }
});

// إرسال طلب صداقة
async function sendFriendRequest(receiverId) {
    try {
        // التحقق من عدم وجود طلب سابق
        const existingRequest = await db.collection('friendRequests')
            .where('senderId', '==', currentUser.uid)
            .where('receiverId', '==', receiverId)
            .where('status', '==', 'pending')
            .get();
        
        if (!existingRequest.empty) {
            alert('لقد أرسلت طلب صداقة بالفعل لهذا المستخدم');
            return;
        }
        
        // الحصول على بيانات المرسل
        const senderDoc = await db.collection('users').doc(currentUser.uid).get();
        const senderData = senderDoc.data();
        
        // إرسال طلب الصداقة
        await db.collection('friendRequests').add({
            senderId: currentUser.uid,
            senderName: senderData.name || senderData.email,
            senderEmail: senderData.email,
            receiverId: receiverId,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showGroupNotification('تم إرسال طلب الصداقة بنجاح', 'success');
        
        // إعادة تشغيل البحث لتحديث الأزرار
        const searchInput = document.getElementById('searchInput');
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        
    } catch (error) {
        console.error('خطأ في إرسال طلب الصداقة:', error);
        alert('حدث خطأ أثناء إرسال طلب الصداقة');
    }
}

// إعداد مستمع طلبات الصداقة
function setupFriendRequestsListener() {
    if (!currentUser) return;
    
    if (friendRequestsListener) {
        friendRequestsListener();
    }
    
    friendRequestsListener = db.collection('friendRequests')
        .where('receiverId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            updateFriendRequestsCounter(snapshot.size);
            
            // إشعار بطلبات جديدة
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const request = change.doc.data();
                    showGroupNotification(`طلب صداقة جديد من ${request.senderName}`, 'info');
                }
            });
        });
}

// تحديث عداد طلبات الصداقة
function updateFriendRequestsCounter(count) {
    const btn = document.getElementById('friendRequestsBtn');
    if (btn) {
        if (count > 0) {
            btn.innerHTML = `👥 طلبات الصداقة (${count})`;
            btn.style.background = '#ff4444';
        } else {
            btn.innerHTML = '👥 طلبات الصداقة';
            btn.style.background = '#2196F3';
        }
    }
}

// فتح نافذة طلبات الصداقة
function openFriendRequestsModal() {
    document.getElementById('friendRequestsModal').style.display = 'block';
    loadFriendRequests();
}

function closeFriendRequestsModal() {
    document.getElementById('friendRequestsModal').style.display = 'none';
}

// تحميل طلبات الصداقة
async function loadFriendRequests() {
    const container = document.getElementById('friendRequestsList');
    container.innerHTML = 'جاري التحميل...';
    
    try {
        const snapshot = await db.collection('friendRequests')
            .where('receiverId', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .orderBy('timestamp', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">لا توجد طلبات صداقة</p>';
            return;
        }
        
        container.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const request = doc.data();
            const requestId = doc.id;
            
            const requestDiv = document.createElement('div');
            requestDiv.style.cssText = `
                border: 1px solid #ddd;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                background: #f9f9f9;
            `;
            
            requestDiv.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>${request.senderName}</strong> يريد إضافتك كصديق
                </div>
                <div style="margin-bottom: 15px; color: #666; font-size: 14px;">
                    ${request.senderEmail}
                </div>
                <div>
                    <button onclick="acceptFriendRequest('${requestId}', '${request.senderId}')" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">قبول</button>
                    <button onclick="rejectFriendRequest('${requestId}')" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">رفض</button>
                </div>
            `;
            
            container.appendChild(requestDiv);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل طلبات الصداقة:', error);
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #f44336;">حدث خطأ أثناء التحميل</p>';
    }
}

// قبول طلب الصداقة
async function acceptFriendRequest(requestId, senderId) {
    try {
        // إضافة الصداقة للطرفين
        await db.collection('friendships').add({
            user1: currentUser.uid,
            user2: senderId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // تحديث حالة الطلب
        await db.collection('friendRequests').doc(requestId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showGroupNotification('تم قبول طلب الصداقة', 'success');
        loadFriendRequests(); // إعادة تحميل القائمة
        loadFriends(); // إعادة تحميل قائمة الأصدقاء
        
    } catch (error) {
        console.error('خطأ في قبول طلب الصداقة:', error);
        alert('حدث خطأ أثناء قبول الطلب');
    }
}

// رفض طلب الصداقة
async function rejectFriendRequest(requestId) {
    try {
        await db.collection('friendRequests').doc(requestId).delete();
        showGroupNotification('تم رفض طلب الصداقة', 'info');
        loadFriendRequests();
        
    } catch (error) {
        console.error('خطأ في رفض طلب الصداقة:', error);
        alert('حدث خطأ أثناء رفض الطلب');
    }
}


function clearCache() {
    userRoleCache.clear();
    joinRequestCache.clear();
    groupMembersCache.clear();
}

// إضافة مستمع لتنظيف التخزين المؤقت كل 10 دقائق
setInterval(clearCache, 10 * 60 * 1000);

// تحميل قائمة الأصدقاء
// مجموعة الأصدقاء (Set)
const friends = new Set();

// تحميل الأصدقاء
function loadFriends() {
    if (!currentUser) return;

    const friendsTemp = new Set();

    // استماع لصداقات user1 = currentUser.uid
    const unsub1 = db.collection('friendships')
        .where('user1', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    friendsTemp.add(change.doc.data().user2);
                }
                if (change.type === 'removed') {
                    friendsTemp.delete(change.doc.data().user2);
                }
            });
            updateFriendsSet(friendsTemp);
        });

    // استماع لصداقات user2 = currentUser.uid
    const unsub2 = db.collection('friendships')
        .where('user2', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    friendsTemp.add(change.doc.data().user1);
                }
                if (change.type === 'removed') {
                    friendsTemp.delete(change.doc.data().user1);
                }
            });
            updateFriendsSet(friendsTemp);
        });

    function updateFriendsSet(newSet) {
        friends.clear();
        newSet.forEach(id => friends.add(id));
        renderFriends();
    }
}

// عرض الأصدقاء في الواجهة
function renderFriends() {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) {
        return;
    }

    friendsList.innerHTML = '';

    if (friends.size === 0) {
        friendsList.innerHTML = '<p>لا يوجد أصدقاء حالياً</p>';
        return;
    }

    // استخدام Promise.all لتحميل جميع بيانات الأصدقاء مرة واحدة
    const friendPromises = Array.from(friends).map(async (friendId) => {
        const friendDoc = await db.collection('users').doc(friendId).get();
        if (!friendDoc.exists) return null;
        
        const friendData = friendDoc.data();
        return { friendId, friendData };
    });

    Promise.all(friendPromises).then(results => {
        results.forEach(result => {
            if (!result) return;
            
            const { friendId, friendData } = result;
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend-item';
            friendDiv.textContent = friendData.name || friendData.email || 'مستخدم';
            
            friendsList.appendChild(friendDiv);
        });
    });
}

// إعداد عدادات الرسائل غير المقروءة
function setupUnreadCountListeners() {
    if (!currentUser) return;
    
    // مستمع لعداد رسائل المجموعات
    setupGroupUnreadCounters();
    
    // مستمع لعداد الرسائل الخاصة
    setupPrivateUnreadCounters();
}

// عداد الرسائل غير المقروءة للمجموعات
function setupGroupUnreadCounters() {
    // تنظيف المستمعين السابقين
    Object.values(unreadCountListeners).forEach(listener => {
        if (typeof listener === 'function') listener();
    });
    
    // مستمع لجميع المجموعات
    db.collection('groupNames').onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
            const groupId = doc.id;
            
            // إعداد مستمع لكل مجموعة
            if (!unreadCountListeners[`group_${groupId}`]) {
                unreadCountListeners[`group_${groupId}`] = db.collection('groups')
                    .doc(groupId)
                    .collection('messages')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .onSnapshot((messagesSnapshot) => {
                        updateGroupUnreadCount(groupId, messagesSnapshot);
                    });
            }
        });
    });
}

// تحديث عداد الرسائل غير المقروءة للمجموعة
function updateGroupUnreadCount(groupId, messagesSnapshot) {
    if (!messagesSnapshot || messagesSnapshot.empty) return;
    
    // الحصول على آخر مرة فتح فيها المستخدم هذه المجموعة
    const lastSeenKey = `lastSeen_group_${groupId}`;
    const lastSeen = localStorage.getItem(lastSeenKey);
    const lastSeenTimestamp = lastSeen ? new Date(lastSeen) : new Date(0);
    
    let unreadCount = 0;
    
    messagesSnapshot.forEach((doc) => {
        const messageData = doc.data();
        if (messageData.timestamp && 
            messageData.timestamp.toDate() > lastSeenTimestamp &&
            messageData.senderId !== currentUser.uid) {
            unreadCount++;
        }
    });
    
    // تحديث العداد في الواجهة
    updateUnreadBadge(`group_${groupId}`, unreadCount);
}

// عداد الرسائل غير المقروءة للمحادثات الخاصة
function setupPrivateUnreadCounters() {
    // مستمع للمحادثات الخاصة
    friends.forEach(friendId => {
        const chatId = [currentUser.uid, friendId].sort().join('_');
        
        if (!unreadCountListeners[`private_${chatId}`]) {
            unreadCountListeners[`private_${chatId}`] = db.collection('privateChats')
                .doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot((messagesSnapshot) => {
                    updatePrivateUnreadCount(friendId, messagesSnapshot);
                });
        }
    });
}

// تحديث عداد الرسائل غير المقروءة للمحادثة الخاصة
function updatePrivateUnreadCount(friendId, messagesSnapshot) {
    if (!messagesSnapshot || messagesSnapshot.empty) return;
    
    const lastSeenKey = `lastSeen_private_${friendId}`;
    const lastSeen = localStorage.getItem(lastSeenKey);
    const lastSeenTimestamp = lastSeen ? new Date(lastSeen) : new Date(0);
    
    let unreadCount = 0;
    
    messagesSnapshot.forEach((doc) => {
        const messageData = doc.data();
        if (messageData.timestamp && 
            messageData.timestamp.toDate() > lastSeenTimestamp &&
            messageData.senderId !== currentUser.uid) {
            unreadCount++;
        }
    });
    
    updateUnreadBadge(`private_${friendId}`, unreadCount);
}

// تحديث شارة العداد
function updateUnreadBadge(elementId, count) {
    const isGroup = elementId.startsWith('group_');
    const id = elementId.replace('group_', '').replace('private_', '');
    
    let targetElement;
    if (isGroup) {
        targetElement = document.querySelector(`[data-group="${id}"]`);
    } else {
        targetElement = document.querySelector(`[data-user="${id}"]`);
    }
    
    if (!targetElement) return;
    
    // إزالة الشارة القديمة
    const oldBadge = targetElement.querySelector('.unread-badge');
    if (oldBadge) oldBadge.remove();
    
    // إضافة شارة جديدة إذا كان هناك رسائل غير مقروءة
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.style.cssText = `
            background: #ff4444;
            color: white;
            border-radius: 50%;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 5px;
            min-width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        badge.textContent = count > 99 ? '99+' : count;
        targetElement.appendChild(badge);
    }
}

// تحديث وقت آخر مشاهدة عند فتح المحادثة
function markAsRead(chatId, type) {
    const key = `lastSeen_${type}_${chatId}`;
    localStorage.setItem(key, new Date().toISOString());
}

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // حفظ حالة تسجيل الدخول في localStorage
            localStorage.setItem('isLoggedIn', 'true');
        })
        .catch(error => alert('خطأ في تسجيل الدخول: ' + error.message));
});

registerBtn.addEventListener('click', () => {
let name = document.getElementById("signupName").value.replace(/\s+/g, '');
const email = emailInput.value.replace(/\s+/g, '');
const password = passwordInput.value.replace(/\s+/g, '');
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
.then(function (userCredential) {
  let user = userCredential.user;

 
  return user.updateProfile({
    displayName: name
  })
  .then(() => {

    return db.collection("users").doc(user.uid).set({
      email: email,
      name: name,
      password: password,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      role: 'user'
    });
  });
})
.then(() => {
  alert('تم إنشاء الحساب بنجاح!');
  
})
.catch(error => {
  alert('خطأ في إنشاء الحساب: ' + error.message);
});

});

logoutBtn.addEventListener('click', () => {
    const userStatusRef = rtdb.ref('/usersStatus/' + currentUser.uid);
    userStatusRef.set({
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        // إزالة حالة تسجيل الدخول من localStorage
        localStorage.removeItem('isLoggedIn');
        auth.signOut();
    });
});

// إصلاح مستمع المجموعات لتجنب التكرار
function setupRealtimeGroupUpdates() {
    if (!currentUser) return;
    
    if (groupsListener) {
        groupsListener();
        groupsListener = null;
    }
    
    loadedGroups.clear();
    groupsList.innerHTML = '<div style="padding: 20px; text-align: center;">جاري تحميل المجموعات...</div>';
    
    groupsListener = db.collection('groupNames')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            const fragment = document.createDocumentFragment();
            const updates = [];
            
            snapshot.docChanges().forEach((change) => {
                const groupId = change.doc.id;
                const groupData = change.doc.data();
                
                if (change.type === 'added' && !loadedGroups.has(groupId)) {
                    loadedGroups.add(groupId);
                    updates.push(() => addGroupToUI(groupId, groupData, fragment));
                }
            });

            // معالجة جميع التحديثات دفعة واحدة
            Promise.all(updates.map(update => update())).then(() => {
                if (fragment.children.length > 0) {
                    groupsList.innerHTML = '';
                    groupsList.appendChild(fragment);
                }
            });
        });
}

// إضافة مجموعة للواجهة
async function addGroupToUI(groupId, groupData, fragment = null) {
    const userId = currentUser.uid;
    
    try {
        // جلب دور المستخدم مع التخزين المؤقت
        let userRole = userRoleCache.get(userId);
        if (!userRole) {
            const userDoc = await db.collection('users').doc(userId).get();
            userRole = userDoc.exists ? userDoc.data().role || 'user' : 'user';
            userRoleCache.set(userId, userRole);
        }

        // جلب الأعضاء مع التخزين المؤقت
        let groupMembers = groupMembersCache.get(groupId);
        if (!groupMembers) {
            const groupMembersDoc = await db.collection('groups').doc(groupId).get();
            groupMembers = groupMembersDoc.exists ? groupMembersDoc.data().members || [] : [];
            groupMembersCache.set(groupId, groupMembers);
        }

        const isOwner = groupData.ownerId === userId;
        const admins = groupData.admins || [];
        const isAdmin = admins.includes(userId);
        const isMember = groupMembers.includes(userId);
        const isSuperAdmin = userRole === 'superadmin';

        let groupHTML = '';

        if (groupData.private) {
            if (isOwner || isAdmin || isMember || isSuperAdmin) {
                groupHTML = `<div class="group-item private-group" data-group="${groupId}">🔒 ${groupData.name}</div>`;
            } else {
                const cacheKey = `${groupId}_${userId}`;
                let hasRequest = joinRequestCache.get(cacheKey);
                
                if (hasRequest === undefined) {
                    const existingRequest = await db.collection('joinRequests')
                        .where('groupId', '==', groupId)
                        .where('userId', '==', userId)
                        .where('status', '==', 'pending')
                        .limit(1)
                        .get();
                    hasRequest = !existingRequest.empty;
                    joinRequestCache.set(cacheKey, hasRequest);
                }

                groupHTML = `
                    <div class="group-item private-group" data-group="${groupId}">
                        🔒 ${groupData.name}
                        <button class="requestJoinBtn" data-group="${groupId}" ${hasRequest ? 'disabled' : ''}>
                            ${hasRequest ? 'تم الإرسال' : 'طلب انضمام'}
                        </button>
                    </div>`;
            }
        } else {
            groupHTML = `<div class="group-item" data-group="${groupId}"># ${groupData.name}</div>`;
        }

        if (fragment) {
            // إذا كان هناك fragment نستخدمه
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = groupHTML;
            if (tempDiv.firstElementChild) {
                fragment.appendChild(tempDiv.firstElementChild);
            }
        } else {
            // إذا لم يكن هناك fragment نضيف مباشرة
            groupsList.insertAdjacentHTML('beforeend', groupHTML);
        }

    } catch (error) {
        console.warn(`خطأ في تحميل المجموعة ${groupId}:`, error);
    }
}

// تحديث مجموعة في الواجهة
function updateGroupInUI(groupId, groupData) {
    const groupElement = document.querySelector(`[data-group="${groupId}"]`);
    if (groupElement) {
        // تحديث اسم المجموعة
        const isPrivate = groupData.private;
        const icon = isPrivate ? '🔒' : '#';
        
        // إذا كان العنصر يحتوي على زر طلب انضمام، احتفظ به
        const requestBtn = groupElement.querySelector('.requestJoinBtn');
        if (requestBtn) {
            groupElement.innerHTML = `${icon} ${groupData.name}`;
            groupElement.appendChild(requestBtn);
        } else {
            groupElement.innerHTML = `${icon} ${groupData.name}`;
        }
    }
}

// إزالة مجموعة من الواجهة
function removeGroupFromUI(groupId) {
    const groupElement = document.querySelector(`[data-group="${groupId}"]`);
    if (groupElement) {
        groupElement.remove();
    }
}

function showGroupNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'info' ? '#2196F3' : '#FF9800'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
        cursor: pointer;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);

        const audio = new Audio('nota.mp3');
    audio.play().catch(e => console.log(e));
    
    const removeNotification = () => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };
    
    notification.addEventListener('click', removeNotification);
    setTimeout(removeNotification, 5000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .message-actions {
        display: none;
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0,0,0,0.7);
        border-radius: 5px;
        padding: 2px;
    }
    .message:hover .message-actions {
        display: block;
    }
    .action-btn {
        background: none;
        border: none;
        color: white;
        padding: 3px 6px;
        margin: 0 1px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
    }
    .action-btn:hover {
        background: rgba(255,255,255,0.2);
    }
    .edit-btn {
        background: #4CAF50 !important;
    }
    .delete-btn {
        background: #f44336 !important;
    }
    .message {
        position: relative;
    }
    .message.editing .message-text {
        display: none;
    }
    .message .edit-input {
        display: none;
        width: 100%;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 3px;
        margin-top: 5px;
    }
    .message.editing .edit-input {
        display: block;
    }
    .edit-controls {
        display: none;
        margin-top: 5px;
    }
    .message.editing .edit-controls {
        display: block;
    }
    .save-edit-btn, .cancel-edit-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 3px 8px;
        margin-right: 5px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
    }
    .cancel-edit-btn {
        background: #757575;
    }
    .message.deleted {
        opacity: 0.5;
        font-style: italic;
    }
    .message.deleted .message-text {
        color: #999;
    }
    .message.editing .message-actions {
        display: none;
    }
    .unread-badge {
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('requestJoinBtn')) {
        const groupId = e.target.getAttribute('data-group');
        const user = firebase.auth().currentUser;

        if (!user) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        try {
            await db.collection('joinRequests').add({
                groupId: groupId,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            showGroupNotification('تم إرسال طلب الانضمام بنجاح', 'success');
            e.target.textContent = 'تم الإرسال';
            e.target.disabled = true;
        } catch (error) {
            console.error('خطأ في إرسال طلب الانضمام:', error);
            alert('حدث خطأ أثناء إرسال الطلب');
        }
    }
});

function setupJoinRequestsListener() {
    if (!currentUser) return;
    
    if (joinRequestsListener) {
        joinRequestsListener();
        joinRequestsListener = null;
    }
    
    joinRequestsListener = db.collection('joinRequests')
        .where('userId', '==', currentUser.uid)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const request = change.doc.data();
                    if (request.status === 'accepted') {
                        showGroupNotification(`تم قبولك في قروب: ${request.groupId}`, 'success');
                    }
                } else if (change.type === 'removed') {
                    showGroupNotification('تم رفض طلب الانضمام', 'warning');
                }
            });
        });
}

async function sendJoinRequest(groupId) {
    try {
        const userId = currentUser.uid;
        const userName = currentUser.displayName || currentUser.email;

        await db.collection('joinRequests').add({
            groupId: groupId,
            userId: userId,
            userName: userName,
            userEmail: currentUser.email,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        showGroupNotification('تم إرسال طلب الانضمام. انتظر موافقة المالك.', 'success');
    } catch (error) {
        console.error('خطأ في إرسال طلب الانضمام:', error);
        alert('حدث خطأ أثناء إرسال طلب الانضمام.');
    }
}

let requestsModal = document.getElementById("requestsModal")

function openJoinRequestsModal() {
    document.getElementById('joinRequestsModal').style.display = 'block';
}

function closeJoinRequestsModal() {
    document.getElementById('joinRequestsModal').style.display = 'none';
}

async function loadJoinRequests(groupId = null) {
    if (!currentUser) return;

    const requestsContainer = document.getElementById('joinRequestsContainer') || document.getElementById("requestListBody");
    if (!requestsContainer) {
        console.error('لم يتم العثور على container للطلبات');
        return;
    }

    requestsContainer.innerHTML = 'جاري التحميل...';

    try {
        // جلب دور المستخدم
        let userRole = 'user';
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role || 'user';
            }
        } catch (error) {
            console.warn('فشل في جلب دور المستخدم:', error);
        }
        const isSuperAdmin = userRole === 'superadmin';

        let query;

        if (groupId) {
            const groupDoc = await db.collection('groupNames').doc(groupId).get();
            if (!groupDoc.exists && !isSuperAdmin) {
                requestsContainer.innerHTML = '<p>المجموعة غير موجودة</p>';
                return;
            }

            const groupData = groupDoc.data();
            const admins = groupData.admins || [];
            const isOwner = groupData.ownerId === currentUser.uid;
            const isAdmin = admins.includes(currentUser.uid);

            if (!isOwner && !isAdmin && !isSuperAdmin) {
                requestsContainer.innerHTML = '<p>ليس لديك صلاحية لعرض هذه الطلبات</p>';
                return;
            }

            query = db.collection('joinRequests')
                .where('groupId', '==', groupId)
                .where('status', '==', 'pending');
        } else {
            const ownedGroupsSnapshot = await db.collection('groupNames')
                .where('ownerId', '==', currentUser.uid)
                .get();

            const adminGroupsSnapshot = await db.collection('groupNames')
                .where('admins', 'array-contains', currentUser.uid)
                .get();

            const allGroupIds = new Set();
            ownedGroupsSnapshot.docs.forEach(doc => allGroupIds.add(doc.id));
            adminGroupsSnapshot.docs.forEach(doc => allGroupIds.add(doc.id));

            if (allGroupIds.size === 0 && !isSuperAdmin) {
                requestsContainer.innerHTML = '<p>لا تملك أي مجموعات أو لست أدمن في أي مجموعة</p>';
                return;
            }

            const groupIdsArray = Array.from(allGroupIds);

            query = db.collection('joinRequests')
                .where('groupId', 'in', groupIdsArray)
                .where('status', '==', 'pending');
        }

        const requestsSnapshot = await query.orderBy('timestamp', 'desc').get();

        if (requestsSnapshot.empty) {
            requestsContainer.innerHTML = '<p>لا توجد طلبات انضمام حالياً</p>';
            return;
        }

        requestsContainer.innerHTML = '';

        for (const requestDoc of requestsSnapshot.docs) {
            const request = requestDoc.data();
            const requestId = requestDoc.id;

            const groupDoc = await db.collection('groupNames').doc(request.groupId).get();
            const groupName = groupDoc.exists ? groupDoc.data().name : 'مجموعة غير معروفة';

            const requestDiv = document.createElement('div');
            requestDiv.className = 'request-item';
            requestDiv.style.cssText = `
                border: 1px solid #ddd;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                background: #f9f9f9;
            `;

            requestDiv.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>${request.userName}</strong> يطلب الانضمام إلى <strong>${groupName}</strong>
                </div>
                <div style="margin-bottom: 10px; color: #666; font-size: 12px;">
                    ${request.userEmail} - ${request.timestamp ? new Date(request.timestamp.toDate()).toLocaleString('ar-SA') : ''}
                </div>
                <div>
                    <button onclick="acceptJoinRequest('${requestId}', '${request.groupId}', '${request.userId}')" style="background: green; color: white; margin-right: 10px; padding: 5px 10px; border: none; border-radius: 4px;">قبول</button>
                    <button onclick="rejectJoinRequest('${requestId}')" style="background: red; color: white; padding: 5px 10px; border: none; border-radius: 4px;">رفض</button>
                </div>
            `;

            requestsContainer.appendChild(requestDiv);
        }
    } catch (error) {
        console.error('خطأ في تحميل طلبات الانضمام:', error);
        requestsContainer.innerHTML = '<p>حدث خطأ أثناء تحميل الطلبات</p>';
    }
}

document.getElementById("showRequestsBtn").addEventListener("click", function () {
    if (!currentGroup) {
        alert("يجب اختيار قروب أولاً");
        return;
    }

    loadJoinRequests(currentGroup);
    document.getElementById("requestsModal").style.display = "block";
    document.getElementById("modalOverlay").style.display = "block";
});

async function acceptJoinRequest(requestId, groupId, userId) {
    try {
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        
        if (!groupDoc.exists) {
            await groupRef.set({
                members: [userId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await groupRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(userId)
            });
        }

        await db.collection('joinRequests').doc(requestId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showGroupNotification('تم قبول الطلب بنجاح', 'success');
        loadJoinRequests();
        
    } catch (error) {
        console.error('خطأ في قبول الطلب:', error);
        alert('حدث خطأ أثناء قبول الطلب');
    }
}

async function rejectJoinRequest(requestId) {
    try {
        await db.collection('joinRequests').doc(requestId).delete();
        showGroupNotification('تم رفض الطلب', 'info');
        loadJoinRequests();
        
    } catch (error) {
        console.error('خطأ في رفض الطلب:', error);
        alert('حدث خطأ أثناء رفض الطلب');
    }
}

async function acceptRequest(requestId, req) {
    return acceptJoinRequest(requestId, req.groupId, req.userId);
}

async function rejectRequest(requestId) {
    return rejectJoinRequest(requestId);
}

async function showJoinRequests(groupName) {
    loadJoinRequests(groupName);
    document.getElementById("joinRequestsModal").style.display = "block";
}

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('group-editable')) {
        const groupId = e.target.getAttribute('data-group');
        const newName = e.target.value.trim();
        if(newName.length === 0) {
            alert("اسم القروب لا يمكن أن يكون فارغاً");
            return;
        }
        db.collection('groupNames').doc(groupId).update({
            name: newName
        }).then(() => {
            console.log("تم تحديث اسم القروب بنجاح");
        })
    }
});

// فتح وإغلاق نافذة أعضاء المجموعة
async function openGroupMembersModal() {
    // جلب دور المستخدم
    let userRole = 'user';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userRole = userDoc.data().role || 'user';
        }
    } catch (error) {
        console.warn('فشل في جلب دور المستخدم:', error);
    }
    const isSuperAdmin = userRole === 'superadmin';

    // التحقق من الصلاحيات
    const groupDoc = await db.collection('groupNames').doc(currentGroup).get();
    if (!groupDoc.exists && !isSuperAdmin) {
        alert('المجموعة غير موجودة');
        return;
    }

    const groupData = groupDoc.data();
    const isOwner = groupData.ownerId === currentUser.uid;
    const admins = groupData.admins || [];
    const isAdmin = admins.includes(currentUser.uid);

    if (!isOwner && !isAdmin && !isSuperAdmin) {
        alert('ليس لديك صلاحية لعرض أعضاء هذه المجموعة');
        return;
    }

    document.getElementById('groupMembersModal').style.display = 'block';
    loadGroupMembers(currentGroup);
}

function closeGroupMembersModal() {
    document.getElementById('groupMembersModal').style.display = 'none';
}

// فتح وإغلاق نافذة دعوة المستخدمين
function openInviteUsersModal() {
    document.getElementById('inviteUsersModal').style.display = 'block';
    document.getElementById('inviteSearchInput').focus();
    // مسح النتائج السابقة
    document.getElementById('inviteUsersList').innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">اكتب على الأقل حرفين للبحث</p>';
}

function closeInviteUsersModal() {
    document.getElementById('inviteUsersModal').style.display = 'none';
    document.getElementById('inviteSearchInput').value = '';
    document.getElementById('inviteUsersList').innerHTML = '';
}

// البحث عن المستخدمين للدعوة - مع إضافة زر إزالة العضو
document.addEventListener('DOMContentLoaded', () => {
    const inviteSearchInput = document.getElementById('inviteSearchInput');
    if (inviteSearchInput) {
        inviteSearchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            const resultsContainer = document.getElementById('inviteUsersList');

            if (searchTerm.length < 2) {
                resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">اكتب على الأقل حرفين للبحث</p>';
                return;
            }

            resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center;">جاري البحث...</p>';

            try {
                if (!currentGroup || !currentUser) {
                    resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #f44336;">خطأ في تحديد المجموعة</p>';
                    return;
                }

                // جلب صلاحيات المستخدم
                const userPermissions = await getUserPermissions(currentUser.uid);
                const { isSuperAdmin, isOwner: isOwnerRole } = userPermissions;
                const hasHighPermissions = isSuperAdmin || isOwnerRole;

                // التحقق من الصلاحيات
                const groupDoc = await db.collection('groupNames').doc(currentGroup).get();
                if (!groupDoc.exists) {
                    if (!hasHighPermissions) {
                        resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #f44336;">المجموعة غير موجودة</p>';
                        return;
                    }
                }

                const groupData = groupDoc.data() || {};
                const isOwner = groupData.ownerId === currentUser.uid;
                const admins = groupData.admins || [];
                const isAdmin = admins.includes(currentUser.uid);

                if (!isOwner && !isAdmin && !hasHighPermissions) {
                    resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #f44336;">ليس لديك صلاحية لدعوة مستخدمين لهذه المجموعة</p>';
                    return;
                }

                // جلب الأعضاء الحاليين
                const groupMembersDoc = await db.collection('groups').doc(currentGroup).get();
                const currentMembers = groupMembersDoc.exists ? groupMembersDoc.data().members || [] : [];

                // البحث في جميع المستخدمين
                const usersSnapshot = await db.collection('users').get();
                const users = new Map();

                usersSnapshot.docs.forEach(doc => {
                    if (doc.id !== currentUser.uid) {
                        const userData = doc.data();
                        const name = (userData.name || '').toLowerCase();
                        const email = (userData.email || '').toLowerCase();

                        if (name.includes(searchTerm) || email.includes(searchTerm)) {
                            users.set(doc.id, { id: doc.id, ...userData });
                        }
                    }
                });

                if (users.size === 0) {
                    resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">لم يتم العثور على مستخدمين</p>';
                    return;
                }

                resultsContainer.innerHTML = '';

                users.forEach((userData, userId) => {
                    const isAlreadyMember = currentMembers.includes(userId);
                    const isAlreadyAdmin = admins.includes(userId);
                    const isOwnerUser = groupData.ownerId === userId;

                    const userDiv = document.createElement('div');
                    userDiv.style.cssText = `
                        padding: 15px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f9f9f9;
                        margin: 5px 0;
                        border-radius: 8px;
                    `;

                    let buttonHtml = '';
                    if (isOwnerUser) {
                        buttonHtml = '<span style="color: #ff9800; font-weight: bold;">👑 مالك</span>';
                    } else if (isAlreadyAdmin) {
                        buttonHtml = '<span style="color: #2196f3; font-weight: bold;">⚡ أدمن</span>';
                    } else if (isAlreadyMember) {
                        buttonHtml = `
                            <div>
                                <span style="color: green; font-weight: bold; margin-right: 10px;">✓ عضو</span>
                                <button onclick="removeMemberFromGroup('${userId}', '${currentGroup}')" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">🗑️ إزالة</button>
                            </div>
                        `;
                    } else {
                        buttonHtml = `<button onclick="inviteUserToGroup('${userId}', '${currentGroup}')" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">✉️ دعوة</button>`;
                    }

                    userDiv.innerHTML = `
                        <div>
                            <div style="font-weight: bold; color: #333;">${userData.name || 'مستخدم'}</div>
                            <div style="color: #666; font-size: 14px;">${userData.email}</div>
                        </div>
                        <div>${buttonHtml}</div>
                    `;

                    resultsContainer.appendChild(userDiv);
                });

            } catch (error) {
                console.error('خطأ في البحث:', error);
                resultsContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #f44336;">حدث خطأ أثناء البحث</p>';
            }
        });
    }
});


// دعوة مستخدم للمجموعة (إضافة مباشرة)


async function getUserPermissions(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userRole = userDoc.data().role || 'user';
            return {
                role: userRole,
                isSuperAdmin: userRole === 'superadmin',
                isOwner: userRole === 'owner'
            };
        }
    } catch (error) {
        console.warn('فشل في جلب صلاحيات المستخدم:', error);
    }
    return { role: 'user', isSuperAdmin: false, isOwner: false };
}

async function inviteUserToGroup(userId, groupId) {
    try {
        // جلب صلاحيات المستخدم الحالي
        const userPermissions = await getUserPermissions(currentUser.uid);
        const { isSuperAdmin, isOwner: isOwnerRole } = userPermissions;
        const hasHighPermissions = isSuperAdmin || isOwnerRole;

        console.log('صلاحيات المستخدم:', userPermissions);

        // التحقق من وجود المجموعة وصلاحية المستخدم
        try {
            const groupDoc = await db.collection('groupNames').doc(groupId).get();
            if (!groupDoc.exists) {
                console.warn('المجموعة غير موجودة');
                if (!hasHighPermissions) {
                    alert('المجموعة غير موجودة');
                    return;
                }
            }

            const groupData = groupDoc.data();
            const isOwner = groupData?.ownerId === currentUser.uid;
            const admins = groupData?.admins || [];
            const isAdmin = admins.includes(currentUser.uid);

            console.log('بيانات المجموعة:', groupData);
            console.log('هل المستخدم هو المالك:', isOwner, 'هل المستخدم هو أدمن:', isAdmin);

            // التحقق من الصلاحيات المحدثة
            if (!isOwner && !isAdmin && !hasHighPermissions) {
                console.warn('ليس لديك صلاحية لدعوة مستخدمين لهذه المجموعة');
                alert('ليس لديك صلاحية لدعوة مستخدمين لهذه المجموعة');
                return;
            }
        } catch (error) {
            console.error('فشل في التحقق من صلاحية المستخدم أو وجود المجموعة:', error);
            
            // إذا كان له صلاحيات عالية، يمكنه المتابعة رغم الخطأ
            if (!hasHighPermissions) {
                alert('حدث خطأ أثناء التحقق من صلاحيتك');
                return;
            } else {
                console.log('مستخدم بصلاحيات عالية يتابع رغم خطأ التحقق من المجموعة');
            }
        }

        // إضافة المستخدم للمجموعة مباشرة
        try {
            const groupMembersRef = db.collection('groups').doc(groupId);
            const groupMembersDoc = await groupMembersRef.get();

            if (!groupMembersDoc.exists) {
                console.log('لا يوجد أعضاء حاليين في المجموعة، إنشاء قائمة جديدة');
                await groupMembersRef.set({
                    members: [userId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const currentMembers = groupMembersDoc.data().members || [];
                if (currentMembers.includes(userId)) {
                    console.warn('هذا المستخدم عضو بالفعل في المجموعة');
                    alert('هذا المستخدم عضو بالفعل في المجموعة');
                    return;
                }

                console.log('إضافة المستخدم إلى قائمة الأعضاء');
                await groupMembersRef.update({
                    members: firebase.firestore.FieldValue.arrayUnion(userId)
                });
            }
        } catch (error) {
            console.error('فشل في إضافة المستخدم للمجموعة:', error);
            alert('حدث خطأ أثناء إضافة المستخدم للمجموعة');
            return;
        }

        // الحصول على اسم المستخدم للإشعار
        try {
            const userDocToInvite = await db.collection('users').doc(userId).get();
            const userName = userDocToInvite.exists ? (userDocToInvite.data().name || userDocToInvite.data().email) : 'مستخدم';
            console.log('تم جلب اسم المستخدم المدعو:', userName);

            showGroupNotification(`تم دعوة ${userName} للمجموعة بنجاح`, 'success');
        } catch (error) {
            console.warn('فشل في جلب اسم المستخدم المدعو:', error);
            showGroupNotification('تمت الدعوة بنجاح، ولكن تعذر جلب اسم المستخدم', 'success');
        }

        // إعادة تشغيل البحث لتحديث الأزرار
        try {
            const searchInput = document.getElementById('inviteSearchInput');
            if (searchInput) {
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
                console.log('تم تحديث قائمة المستخدمين المدعوين');
            }
        } catch (error) {
            console.warn('فشل في تحديث قائمة المستخدمين المدعوين:', error);
        }

    } catch (error) {
        console.error('خطأ في دعوة المستخدم:', error);
        alert('حدث خطأ أثناء دعوة المستخدم');
    }
}


// دالة محدثة لإزالة عضو من المجموعة - مع دعم superadmin
async function removeMemberFromGroup(userId, groupId) {
    try {
        // جلب صلاحيات المستخدم الحالي
        let userRole = 'user';
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role || 'user';
            }
        } catch (error) {
            console.warn('فشل في جلب دور المستخدم الحالي:', error);
        }

        const isSuperAdmin = userRole === 'superadmin';
        const isOwnerRole = userRole === 'owner';
        const hasHighPermissions = isSuperAdmin || isOwnerRole;

        // التحقق من الصلاحيات
        const groupDoc = await db.collection('groupNames').doc(groupId).get();
        if (!groupDoc.exists) {
            if (!hasHighPermissions) {
                alert('المجموعة غير موجودة');
                return;
            }
        }

        const groupData = groupDoc.data() || {};
        const isOwner = groupData.ownerId === currentUser.uid;
        const admins = groupData.admins || [];
        const isAdmin = admins.includes(currentUser.uid);

        // التحقق من الصلاحيات المحدثة
        if (!isOwner && !isAdmin && !hasHighPermissions) {
            alert('ليس لديك صلاحية لإزالة أعضاء من هذه المجموعة');
            return;
        }

        // منع إزالة المالك (إلا إذا كان superadmin أو owner role)
        if (groupData.ownerId === userId && !hasHighPermissions) {
            alert('لا يمكن إزالة مالك المجموعة');
            return;
        }

        // تحذير خاص للمستخدمين ذوي الصلاحيات العالية عند إزالة المالك
        if (groupData.ownerId === userId && hasHighPermissions) {
            if (!confirm('تحذير: أنت تحاول إزالة مالك المجموعة! هذا قد يؤثر على إدارة المجموعة. هل تريد المتابعة؟')) {
                return;
            }
        }

        // تأكيد الإزالة
        const userDoc = await db.collection('users').doc(userId).get();
        const userName = userDoc.exists ? (userDoc.data().name || userDoc.data().email) : 'مستخدم';
        
        if (!confirm(`هل أنت متأكد من إزالة ${userName} من المجموعة؟`)) {
            return;
        }

        // إزالة المستخدم من قائمة الأعضاء
        const groupMembersRef = db.collection('groups').doc(groupId);
        try {
            await groupMembersRef.update({
                members: firebase.firestore.FieldValue.arrayRemove(userId)
            });
        } catch (error) {
            console.error('خطأ في إزالة المستخدم من قائمة الأعضاء:', error);
            // إذا كان المستخدم ذو صلاحيات عالية، يمكنه المتابعة رغم الخطأ
            if (!hasHighPermissions) {
                alert('حدث خطأ أثناء إزالة العضو من قائمة الأعضاء');
                return;
            } else {
                console.log('مستخدم بصلاحيات عالية يتابع رغم خطأ إزالة العضو');
            }
        }

        // إزالة المستخدم من قائمة الأدمن إذا كان أدمن
        if (admins.includes(userId)) {
            try {
                await db.collection('groupNames').doc(groupId).update({
                    admins: firebase.firestore.FieldValue.arrayRemove(userId)
                });
            } catch (error) {
                console.error('خطأ في إزالة المستخدم من قائمة الأدمن:', error);
                // المتابعة حتى لو فشلت إزالة الأدمن
            }
        }

        showGroupNotification(`تم إزالة ${userName} من المجموعة`, 'success');
        
        // إعادة تشغيل البحث لتحديث الأزرار
        try {
            const searchInput = document.getElementById('inviteSearchInput');
            if (searchInput) {
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
            }
        } catch (error) {
            console.warn('فشل في تحديث قائمة المستخدمين:', error);
        }

    } catch (error) {
        console.error('خطأ في إزالة العضو:', error);
        alert('حدث خطأ أثناء إزالة العضو');
    }
}

// تحميل أعضاء المجموعة
async function loadGroupMembers(groupId) {
    if (!groupId || !currentUser) {
        console.log('❌ لا يوجد groupId أو currentUser:', { groupId, currentUser });
        return;
    }

    const container = document.getElementById('groupMembersList');
    container.innerHTML = 'جاري التحميل...';

    try {
        console.log('🔍 بدء تحميل أعضاء المجموعة:', groupId);
        console.log('👤 المستخدم الحالي:', currentUser.uid);

        // جلب دور المستخدم
        let userRole = 'user';
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            console.log('📄 وثيقة المستخدم موجودة:', userDoc.exists);
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('📋 بيانات المستخدم الكاملة:', userData);
                userRole = userData.role || 'user';
                console.log('🎭 دور المستخدم:', userRole);
            } else {
                console.warn('⚠️ المستخدم غير موجود في قاعدة البيانات');
            }
        } catch (error) {
            console.error('❌ فشل في جلب دور المستخدم:', error);
        }
        
        const isSuperAdmin = userRole === 'superadmin';
        const isOwnerRole = userRole === 'owner';
        const hasHighPermissions = isSuperAdmin || isOwnerRole;

        console.log('🔒 الصلاحيات:', {
            userRole,
            isSuperAdmin,
            isOwnerRole,
            hasHighPermissions
        });

        // التحقق من وجود المجموعة
        let groupData = {};
        let groupExists = false;
        
        try {
            const groupDoc = await db.collection('groupNames').doc(groupId).get();
            groupExists = groupDoc.exists;
            console.log('📁 المجموعة موجودة في groupNames:', groupExists);
            
            if (groupExists) {
                groupData = groupDoc.data() || {};
                console.log('📋 بيانات المجموعة:', groupData);
            }
        } catch (error) {
            console.error('❌ خطأ في جلب بيانات المجموعة:', error);
        }

        // فحص الصلاحيات للمجموعة
        if (!groupExists && !hasHighPermissions) {
            console.log('❌ المجموعة غير موجودة وليس لديك صلاحية عالية');
            container.innerHTML = '<p>المجموعة غير موجودة</p>';
            return;
        }

        const isOwner = groupData.ownerId === currentUser.uid;
        const admins = groupData.admins || [];
        const isAdmin = admins.includes(currentUser.uid);

        console.log('🔐 فحص الصلاحيات:', {
            isOwner,
            isAdmin,
            admins,
            currentUserId: currentUser.uid,
            groupOwnerId: groupData.ownerId
        });

        // الشرط الأساسي للصلاحية
        const hasPermission = isOwner || isAdmin || hasHighPermissions;
        console.log('✅ هل لديه صلاحية:', hasPermission);

        if (!hasPermission) {
            console.log('❌ ليس لديك صلاحية لعرض أعضاء هذه المجموعة');
            container.innerHTML = '<p>ليس لديك صلاحية لعرض أعضاء هذه المجموعة</p>';
            return;
        }

        console.log('✅ تم السماح بالوصول، جاري جلب الأعضاء...');

        // جلب رسائل المجموعة للحصول على المستخدمين الذين رسلوا
        const messagesSnapshot = await db.collection('groups')
            .doc(groupId)
            .collection('messages')
            .get();

        console.log('💬 عدد الرسائل في المجموعة:', messagesSnapshot.size);

        // إنشاء مجموعة من معرفات المستخدمين الذين رسلوا رسائل
        const messageSenders = new Set();
        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            if (messageData.senderId) {
                messageSenders.add(messageData.senderId);
            }
        });

        console.log('👥 المرسلون:', Array.from(messageSenders));

        // جلب الأعضاء الرسميين
        const groupMembersDoc = await db.collection('groups').doc(groupId).get();
        const officialMembers = groupMembersDoc.exists ? groupMembersDoc.data().members || [] : [];

        console.log('📝 الأعضاء الرسميون:', officialMembers);

        // دمج الأعضاء الرسميين مع الذين رسلوا رسائل
        const allMemberIds = new Set([...officialMembers, ...messageSenders]);

        console.log('👥 جميع أعضاء المجموعة:', Array.from(allMemberIds));

        if (allMemberIds.size === 0) {
            console.log('⚠️ لا يوجد أعضاء في المجموعة');
            container.innerHTML = '<p>لا يوجد أعضاء في هذه المجموعة</p>';
            return;
        }

        container.innerHTML = '';

        // جلب بيانات كل عضو وعرضها
        for (const memberId of allMemberIds) {
            try {
                const memberDoc = await db.collection('users').doc(memberId).get();
                if (!memberDoc.exists) {
                    console.warn('⚠️ العضو غير موجود:', memberId);
                    continue;
                }

                const memberData = memberDoc.data();
                const isOfficialMember = officialMembers.includes(memberId);
                const hasSentMessages = messageSenders.has(memberId);
                const isMemberAdmin = admins.includes(memberId);
                const isMemberOwner = groupData.ownerId === memberId;

                const memberDiv = document.createElement('div');
                memberDiv.style.cssText = `
                    border: 1px solid #ddd;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-radius: 8px;
                    background: #f9f9f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                let statusBadges = '';
                if (isMemberOwner) {
                    statusBadges += '<span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-left: 5px;">👑 مالك</span>';
                }
                if (isMemberAdmin) {
                    statusBadges += '<span style="background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-left: 5px;">⚡ أدمن</span>';
                }
                if (isOfficialMember) {
                    statusBadges += '<span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-left: 5px;">✓ عضو</span>';
                }
                if (hasSentMessages) {
                    statusBadges += '<span style="background: #9c27b0; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-left: 5px;">💬 متفاعل</span>';
                }

                memberDiv.innerHTML = `
                    <div>
                        <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                            ${memberData.name || memberData.email || 'مستخدم'}
                        </div>
                        <div style="color: #666; font-size: 14px; margin-bottom: 5px;">
                            ${memberData.email}
                        </div>
                        <div>
                            ${statusBadges}
                        </div>
                    </div>
                `;

                container.appendChild(memberDiv);

            } catch (error) {
                console.error(`❌ خطأ في جلب بيانات العضو ${memberId}:`, error);
            }
        }

        console.log('✅ تم تحميل جميع الأعضاء بنجاح');

    } catch (error) {
        console.error('❌ خطأ عام في تحميل أعضاء المجموعة:', error);
        container.innerHTML = '<p>حدث خطأ أثناء تحميل الأعضاء</p>';
    }
}



function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        // المستخدم مسجل الدخول، قم بإخفاء نموذج تسجيل الدخول وإظهار لوحة التحكم
        authContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        userEmail.textContent = auth.currentUser.email; // تأكد من عرض البريد الإلكتروني
        
        // يمكنك هنا استدعاء الدوال التي تقوم بتحميل بيانات المستخدم وإعداد الواجهة
        loadFriends();
        loadUsers();
        setupRealtimeGroupUpdates();
        setupFriendRequestsListener();
        setupUnreadCountListeners();
        
        // تحديث حالة المستخدم في الوقت الحقيقي
        const userStatusRef = rtdb.ref('/usersStatus/' + auth.currentUser.uid);
        userStatusRef.set({
            state: 'online',
            last_changed: firebase.database.ServerValue.TIMESTAMP
        });
        userStatusRef.onDisconnect().set({
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP
        });
    } else {
        // المستخدم غير مسجل الدخول، قم بإظهار نموذج تسجيل الدخول
        authContainer.style.display = 'flex';
        chatContainer.style.display = 'none';
    }
}

groupsList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('group-item') || e.target.parentElement.classList.contains('group-item')) {
        const groupItem = e.target.classList.contains('group-item') ? e.target : e.target.parentElement;
        const groupName = groupItem.getAttribute('data-group');
        
        currentGroup = groupName;
        
        document.querySelectorAll('.group-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
        
        groupItem.classList.add('active');
        
        // تحديد الرسائل كمقروءة
        markAsRead(groupName, 'group');
        await canSendMessage(); // هذه تفحص الحظر والكتم والعضوية وتعرض الرسالة أو تظهر الإدخال
        await loadGroupChat(groupName);
        const inputArea = document.getElementById('input_area');
        inputArea.style.display="flex"
       document.getElementById("showRequestsBtn").setAttribute("style", "display: block !important;");



    }
});

function loadUsers() {
    let usersSnapshot = null;
    let statusData = {};
    
    const statusRef = rtdb.ref("usersStatus");
    statusRef.on('value', (statusSnapshot) => {
        statusData = statusSnapshot.val() || {};
        if (usersSnapshot) {
            renderUsers(usersSnapshot, statusData);
        }
    });
    
    db.collection('users').limit(100).onSnapshot((snapshot) => {
        usersSnapshot = snapshot;
        renderUsers(snapshot, statusData);
    });
}

// دالة محسنة لعرض المستخدمين - نفس الاسم
function renderUsers(usersSnapshot, statusData) {
    if (!usersSnapshot) return;

    const fragment = document.createDocumentFragment();
    const onlineUsers = [];
    const offlineUsers = [];

    usersSnapshot.forEach((doc) => {
        if (doc.id !== currentUser.uid) {
            const userId = doc.id;
            const userData = doc.data();
            const isOnline = statusData[userId]?.state === "online";

            const userObj = { userId, userData, isOnline };
            if (isOnline) onlineUsers.push(userObj);
            else offlineUsers.push(userObj);
        }
    });

    // إضافة المستخدمين المتصلين أولاً
    onlineUsers.forEach(({ userId, userData, isOnline }) => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.setAttribute('data-user', userId);

        userDiv.innerHTML = `
            <span class="user-name">${userData.name || userData.email}</span>
            <span class="status-dot" style="
                width:10px;
                height:10px;
                border-radius:50%;
                display:inline-block;
                background:${isOnline ? "green" : "gray"};
                margin-right:5px;
            "></span>
        `;

        userDiv.addEventListener('click', () => {
            markAsRead(userId, 'private');
            loadPrivateChat(userId, userData.name || userData.email);
        });

        fragment.appendChild(userDiv);
    });

    // ثم المستخدمين غير المتصلين
    offlineUsers.forEach(({ userId, userData, isOnline }) => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.setAttribute('data-user', userId);

        userDiv.innerHTML = `
            <span class="user-name">${userData.name || userData.email}</span>
            <span class="status-dot" style="
                width:10px;
                height:10px;
                border-radius:50%;
                display:inline-block;
                background:${isOnline ? "green" : "gray"};
                margin-right:5px;
            "></span>
        `;

        userDiv.addEventListener('click', () => {
            markAsRead(userId, 'private');
            loadPrivateChat(userId, userData.name || userData.email);
        });

        fragment.appendChild(userDiv);
    });

    usersList.innerHTML = '';
    usersList.appendChild(fragment);
}

async function loadGroupChat(groupName) {
    if (messagesListener) {
        messagesListener();
    }

    currentChat = groupName;
    currentChatType = 'group';

    const groupInfoDoc = await db.collection('groupNames').doc(groupName).get();

    if (!groupInfoDoc.exists) {
        chatHeader.textContent = `📢 ${groupName}`;
        messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">المجموعة غير موجودة</div>';
        currentGroupInfo = null;
        return;
    }

    currentGroupInfo = groupInfoDoc.data();
    currentGroupInfo.id = groupName;
    const isOwner = currentGroupInfo.ownerId === currentUser.uid;
    const admins = currentGroupInfo.admins || [];
    const isAdmin = admins.includes(currentUser.uid);

    let isMember = false;
    if (currentGroupInfo.private) {
        const groupMembersDoc = await db.collection('groups').doc(groupName).get();
        const groupMembers = groupMembersDoc.exists ? groupMembersDoc.data().members || [] : [];
        isMember = groupMembers.includes(currentUser.uid);
    }

    // جلب دور المستخدم
    let userRole = 'user';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userRole = userDoc.data().role || 'user';
        }
    } catch (error) {
        console.warn('فشل في جلب دور المستخدم:', error);
    }
    const isSuperAdmin = userRole === 'superadmin';

    const displayName = groupName === 'عام' ? 'عام' : currentGroupInfo.name || groupName;

    // تفريغ العنوان قبل الإضافة
    chatHeader.innerHTML = '';

    // إنشاء العنصر الرئيسي للاسم
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `📢 ${displayName}`;
    chatHeader.appendChild(nameSpan);

    // إضافة أزرار الخيارات للمالك والأدمن و superadmin
    if (isOwner || isAdmin || isSuperAdmin) {
        const optionsBtn = document.createElement('button');
        optionsBtn.textContent = '⋮';
        optionsBtn.className = 'group-options-btn';
        optionsBtn.dataset.group = groupName;
        optionsBtn.style.marginRight = '8px';
        optionsBtn.style.marginLeft = '12px';
        optionsBtn.style.cursor = 'pointer';

        chatHeader.appendChild(optionsBtn);
      
    }

    messagesContainer.innerHTML = '';

    messagesListener = db.collection('groups')
        .doc(groupName)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                displayMessage(doc.data(), doc.id);
            });

            requestAnimationFrame(scrollToBottom);
        });

    // المنطق المحدث للمجموعات الخاصة
    if (currentGroupInfo.private && !isOwner && !isAdmin && !isMember && !isSuperAdmin) {
        const ownerDoc = await db.collection('users').doc(currentGroupInfo.ownerId).get();
        const ownerName = ownerDoc.exists ? (ownerDoc.data().name || ownerDoc.data().email) : 'مستخدم مجهول';

        messagesContainer.innerHTML = `
            <div class="notMemberMessage" style="text-align: center; padding: 30px; background: #f5f5f5; border-radius: 10px; margin: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">🔒 مجموعة خاصة</h3>
                <p style="color: #666; margin-bottom: 10px;">هذه مجموعة خاصة وأنت لست عضواً فيها</p>
                <p style="color: #888; margin-bottom: 20px;"><strong>مالك المجموعة:</strong> ${ownerName}</p>
                <p style="color: #999; font-size: 14px;">يمكنك طلب الانضمام من القائمة الجانبية</p>
            </div>
        `;

        messageInput.disabled = true;
        messageInput.placeholder = "لا يمكنك إرسال رسائل في هذه المجموعة";
        sendBtn.disabled = true;

        return;
    }

    messageInput.disabled = false;
    messageInput.placeholder = "اكتب رسالتك هنا...";
    sendBtn.disabled = false;
}

// تحسين قائمة خيارات المجموعة - مع إضافة خيار دعوة الأصدقاء
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('group-options-btn')) {
      const groupId = e.target.dataset.group;
      openGroupOptionsMenu(groupId, e.target);
    }
  
    if (e.target.classList.contains('add-admin-option')) {
      const groupId = e.target.dataset.group;
      document.querySelector('.group-options-menu')?.remove();
      openAddAdminDialog(groupId);
    }

    if (e.target.classList.contains('edit-group-name-option')) {
      const groupId = e.target.dataset.group;
      document.querySelector('.group-options-menu')?.remove();
      openEditGroupNameDialog(groupId);
    }

    if (e.target.classList.contains('toggle-privacy-option')) {
      const groupId = e.target.dataset.group;
      document.querySelector('.group-options-menu')?.remove();
      toggleGroupPrivacy(groupId);
    }

    if (e.target.classList.contains('group-members-option')) {
      const groupId = e.target.dataset.group;
      document.querySelector('.group-options-menu')?.remove();
      currentGroup = groupId; // تحديث currentGroup
      openGroupMembersModal();
    }

    if (e.target.classList.contains('invite-users-option')) {
      const groupId = e.target.dataset.group;
      document.querySelector('.group-options-menu')?.remove();
      currentGroup = groupId; // تحديث currentGroup
      openInviteUsersModal();
    }
  
    if (e.target.classList.contains('close-modal-btn')) {
      e.target.closest('.modal')?.remove();
    }
});



// قائمة خيارات محسنة للمجموعة - مع إضافة خيار دعوة الأصدقاء
async function openGroupOptionsMenu(groupId, buttonElement) {
    document.querySelector('.group-options-menu')?.remove();

    // التحقق من الصلاحيات
    const groupDoc = await db.collection('groupNames').doc(groupId).get();
    if (!groupDoc.exists) return;

    const groupData = groupDoc.data();
    const isOwner = groupData.ownerId === currentUser.uid;
    const admins = groupData.admins || [];
    const isAdmin = admins.includes(currentUser.uid);

    // جلب دور المستخدم
    const userPermissions = await getUserPermissions(currentUser.uid);
    const { isSuperAdmin, isOwner: isOwnerRole } = userPermissions;
    
    // التحقق من الصلاحيات العالية
    const hasHighPermissions = isSuperAdmin || isOwnerRole;

    if (!isOwner && !isAdmin && !hasHighPermissions) return;

    const menu = document.createElement('div');
    menu.className = 'group-options-menu';

    let menuItems = '';

    // جميع المستخدمين الذين لديهم صلاحيات
    if (isOwner || isAdmin || hasHighPermissions) {
        menuItems += `<li class="group-members-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #3B3D41">👥 أعضاء المجموعة</li>`;

        // خيار دعوة المستخدمين فقط للمجموعات الخاصة
        if (groupData.private) {
            menuItems += `<li class="invite-users-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #3B3D41">✉️ دعوة مستخدمين</li>`;
        }

        menuItems += `<li class="add-admin-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #3B3D41">👥 إدارة الأدمن</li>`;
        menuItems += `<li class="edit-group-name-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #3B3D41">✏️ تغيير اسم المجموعة</li>`;
        menuItems += `<li class="toggle-privacy-option" data-group="${groupId}" style="padding:8px;cursor:pointer">🔐 ${groupData.private ? 'جعل المجموعة عامة' : 'جعل المجموعة خاصة'}</li>`;
    }

    // خيارات إضافية للـ superadmin
    if (hasHighPermissions) {
        menuItems += `<li class="delete-group-option" data-group="${groupId}" style="padding:8px;cursor:pointer;color:red">🗑️ حذف المجموعة</li>`;
    }

    menu.innerHTML = `<ul style="list-style:none;margin:0;padding:0">${menuItems}</ul>`;

    // تنسيق القائمة
    const rect = buttonElement.getBoundingClientRect();
    Object.assign(menu.style, {
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX}px`,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '5px',
        zIndex: 1000,
        boxShadow: '0 0 6px rgba(0,0,0,0.2)',
        minWidth: '200px'
    });

    document.body.appendChild(menu);

    // إغلاق القائمة عند الضغط بالخارج
    const close = (e) => {
        if (!menu.contains(e.target) && e.target !== buttonElement) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
}

// وظيفة حذف المجموعة (لـ superadmin)
async function deleteGroup(groupId) {
    // جلب دور المستخدم
    let userRole = 'user';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userRole = userDoc.data().role || 'user';
        }
    } catch (error) {
        console.warn('فشل في جلب دور المستخدم:', error);
    }
    const isSuperAdmin = userRole === 'superadmin';

    if (!isSuperAdmin) {
        alert('ليس لديك صلاحية لحذف هذه المجموعة.');
        return;
    }

    if (confirm('هل أنت متأكد أنك تريد حذف هذه المجموعة؟')) {
        try {
            // حذف المجموعة من مجموعة groupNames
            await db.collection('groupNames').doc(groupId).delete();

            // حذف جميع الرسائل في المجموعة
            const messagesRef = db.collection('groups').doc(groupId).collection('messages');
            const messagesSnapshot = await messagesRef.get();
            const batch = db.batch();
            messagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            showGroupNotification('تم حذف المجموعة بنجاح.', 'success');
        } catch (error) {
            console.error('خطأ في حذف المجموعة:', error);
            alert('حدث خطأ أثناء حذف المجموعة.');
        }
    }
}

// إضافة مستمع للزر حذف المجموعة
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-group-option')) {
        const groupId = e.target.dataset.group;
        deleteGroup(groupId);
        document.querySelector('.group-options-menu')?.remove();
    }
});

// دالة تغيير اسم المجموعة - محدثة للأدمن
function openEditGroupNameDialog(groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>تغيير اسم المجموعة</h3>
            <input type="text" id="newGroupNameInput" placeholder="اسم المجموعة الجديد..." />
            <div style="margin-top:15px;">
                <button id="saveNewGroupName" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 5px; margin-right: 10px; cursor: pointer;">حفظ</button>
                <button class="close-modal-btn" style="background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إلغاء</button>
            </div>
        </div>
    `;

    Object.assign(modal.style, {
        position: 'fixed',
        top: '0', left: '0', right: '0', bottom: '0',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
    });

    const content = modal.querySelector('.modal-content');
    Object.assign(content.style, {
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '300px'
    });

    document.body.appendChild(modal);

    const input = modal.querySelector('#newGroupNameInput');
    const saveBtn = modal.querySelector('#saveNewGroupName');

    // تحميل الاسم الحالي
    db.collection('groupNames').doc(groupId).get().then(doc => {
        if (doc.exists) {
            input.value = doc.data().name || '';
        }
    });

    saveBtn.addEventListener('click', async () => {
        const newName = input.value.trim();
        if (!newName) {
            alert('يرجى إدخال اسم صحيح للمجموعة');
            return;
        }

        // جلب دور المستخدم
        let userRole = 'user';
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role || 'user';
            }
        } catch (error) {
            console.warn('فشل في جلب دور المستخدم:', error);
        }
        const isSuperAdmin = userRole === 'superadmin';

        // التحقق من الصلاحيات مرة أخرى
        const groupDoc = await db.collection('groupNames').doc(groupId).get();
        if (groupDoc.exists && !isSuperAdmin) {
            const groupData = groupDoc.data();
            const isOwner = groupData.ownerId === currentUser.uid;
            const admins = groupData.admins || [];
            const isAdmin = admins.includes(currentUser.uid);

            if (!isOwner && !isAdmin && !isSuperAdmin) {
                alert('ليس لديك صلاحية لتغيير اسم هذه المجموعة');
                modal.remove();
                return;
            }
        }

        try {
            await db.collection('groupNames').doc(groupId).update({
                name: newName
            });
            showGroupNotification('تم تغيير اسم المجموعة بنجاح', 'success');
            modal.remove();
        } catch (error) {
            console.error('خطأ في تغيير اسم المجموعة:', error);
            alert('حدث خطأ أثناء تغيير اسم المجموعة');
        }
    });

    input.focus();
}


async function toggleGroupPrivacy(groupId) {
    try {
        // جلب دور المستخدم
        let userRole = 'user';
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role || 'user';
            }
        } catch (error) {
            console.warn('فشل في جلب دور المستخدم:', error);
        }
        const isSuperAdmin = userRole === 'superadmin';

        const groupDoc = await db.collection('groupNames').doc(groupId).get();
        if (!groupDoc.exists && !isSuperAdmin) return;

        const groupData = groupDoc.data();
        const isOwner = groupData.ownerId === currentUser.uid;
        const admins = groupData.admins || [];
        const isAdmin = admins.includes(currentUser.uid);

        if (!isOwner && !isAdmin && !isSuperAdmin) {
            alert('ليس لديك صلاحية لتغيير خصوصية هذه المجموعة');
            return;
        }

        const newPrivacy = !groupData.private;

        const confirmMessage = newPrivacy
            ? 'هل تريد جعل هذه المجموعة خاصة؟ سيحتاج المستخدمون لطلب الانضمام.'
            : 'هل تريد جعل هذه المجموعة عامة؟ يمكن لأي شخص الانضمام إليها.';

        if (confirm(confirmMessage)) {
            await db.collection('groupNames').doc(groupId).update({
                private: newPrivacy
            });

            const statusMessage = newPrivacy
                ? 'تم جعل المجموعة خاصة بنجاح'
                : 'تم جعل المجموعة عامة بنجاح';

            showGroupNotification(statusMessage, 'success');
        }
    } catch (error) {
        console.error('خطأ في تغيير خصوصية المجموعة:', error);
        alert('حدث خطأ أثناء تغيير خصوصية المجموعة');
    }
}

// دالة إدارة الأدمن محسنة
// دالة محدثة للتحقق من صلاحيات المستخدم
async function getUserPermissions(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userRole = userDoc.data().role || 'user';
            return {
                role: userRole,
                isSuperAdmin: userRole === 'superadmin',
                isOwner: userRole === 'owner'
            };
        }
    } catch (error) {
        console.warn('فشل في جلب صلاحيات المستخدم:', error);
    }
    return { role: 'user', isSuperAdmin: false, isOwner: false };
}

// دالة محدثة لفتح قائمة خيارات المجموعة
async function openGroupOptionsMenu(groupId, buttonElement) {
    document.querySelector('.group-options-menu')?.remove();

    // التحقق من الصلاحيات
    const groupDoc = await db.collection('groupNames').doc(groupId).get();
    if (!groupDoc.exists) return;

    const groupData = groupDoc.data();
    const isOwner = groupData.ownerId === currentUser.uid;
    const admins = groupData.admins || [];
    const isAdmin = admins.includes(currentUser.uid);

    // جلب دور المستخدم
    const userPermissions = await getUserPermissions(currentUser.uid);
    const { isSuperAdmin, isOwner: isOwnerRole } = userPermissions;
    
    // التحقق من الصلاحيات العالية
    const hasHighPermissions = isSuperAdmin || isOwnerRole;

    if (!isOwner && !isAdmin && !hasHighPermissions) return;

    const menu = document.createElement('div');
    menu.className = 'group-options-menu';

    let menuItems = '';

    // جميع المستخدمين الذين لديهم صلاحيات
    if (isOwner || isAdmin || hasHighPermissions) {
        menuItems += `<li class="group-members-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #eee">👥 أعضاء المجموعة</li>`;

        // خيار دعوة المستخدمين فقط للمجموعات الخاصة
        if (groupData.private) {
            menuItems += `<li class="invite-users-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #eee">✉️ دعوة مستخدمين</li>`;
        }

        menuItems += `<li class="add-admin-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #eee">👥 إدارة الأدمن</li>`;
        menuItems += `<li class="edit-group-name-option" data-group="${groupId}" style="padding:8px;cursor:pointer;border-bottom:1px solid #eee">✏️ تغيير اسم المجموعة</li>`;
        menuItems += `<li class="toggle-privacy-option" data-group="${groupId}" style="padding:8px;cursor:pointer">🔐 ${groupData.private ? 'جعل المجموعة عامة' : 'جعل المجموعة خاصة'}</li>`;
    }

    // خيارات إضافية للـ superadmin
    if (hasHighPermissions) {
        menuItems += `<li class="delete-group-option" data-group="${groupId}" style="padding:8px;cursor:pointer;color:red">🗑️ حذف المجموعة</li>`;
    }

    menu.innerHTML = `<ul style="list-style:none;margin:0;padding:0">${menuItems}</ul>`;

    // تنسيق القائمة
    const rect = buttonElement.getBoundingClientRect();
    Object.assign(menu.style, {
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX}px`,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '5px',
        zIndex: 1000,
        boxShadow: '0 0 6px rgba(0,0,0,0.2)',
        minWidth: '200px'
    });

    document.body.appendChild(menu);

    // إغلاق القائمة عند الضغط بالخارج
    const close = (e) => {
        if (!menu.contains(e.target) && e.target !== buttonElement) {
            menu.remove();
            document.removeEventListener('click', close);
        }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
}

// دالة محدثة لفتح نافذة إدارة الأدمن
function openAddAdminDialog(groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>إدارة الأدمن</h3>
            <input type="text" id="adminSearchInput" placeholder="اكتب الاسم أو البريد..." />
            <div id="adminSearchResults" style="margin-top:10px; max-height: 300px; overflow-y: auto;"></div>
            <button class="close-modal-btn" style="margin-top:10px; background: #ccc; color: black; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">إغلاق</button>
        </div>
    `;
    
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0', left: '0', right: '0', bottom: '0',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
    });

    const content = modal.querySelector('.modal-content');
    Object.assign(content.style, {
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        maxHeight: '500px'
    });

    document.body.appendChild(modal);

    const input = modal.querySelector('#adminSearchInput');
    const resultsContainer = modal.querySelector('#adminSearchResults');

    input.addEventListener('input', debounce(async () => {
        const query = input.value.trim().toLowerCase();
        resultsContainer.innerHTML = '';
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 10px;">اكتب على الأقل حرفين للبحث</p>';
            return;
        }

        try {
            // جلب بيانات المجموعة والأعضاء
            const groupDoc = await db.collection('groupNames').doc(groupId).get();
            const groupData = groupDoc.data();
            const admins = groupData.admins || [];

            const groupMembersDoc = await db.collection('groups').doc(groupId).get();
            const members = groupMembersDoc.exists ? groupMembersDoc.data().members || [] : [];

            // البحث في المستخدمين
            const usersSnap = await db.collection('users').get();
            const matchedUsers = [];

            usersSnap.forEach(doc => {
                if (doc.id === currentUser.uid) return; // تجاهل المستخدم الحالي
                
                const user = doc.data();
                const name = user.name?.toLowerCase() || '';
                const email = user.email?.toLowerCase() || '';
                
                if (name.includes(query) || email.includes(query)) {
                    matchedUsers.push({
                        id: doc.id,
                        ...user,
                        isAdmin: admins.includes(doc.id),
                        isMember: members.includes(doc.id)
                    });
                }
            });

            if (matchedUsers.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 10px;">لم يتم العثور على مستخدمين</p>';
                return;
            }

            // عرض النتائج
            matchedUsers.forEach(user => {
                const div = document.createElement('div');
                div.style.cssText = `
                    padding: 12px;
                    border: 1px solid #ddd;
                    margin-bottom: 8px;
                    border-radius: 6px;
                    background: #f9f9f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                let buttonHtml = '';
                if (user.isAdmin) {
                    buttonHtml = `<button data-user="${user.id}" data-group="${groupId}" class="toggle-admin-btn" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">🚫 إزالة أدمن</button>`;
                } else {
                    buttonHtml = `<button data-user="${user.id}" data-group="${groupId}" class="toggle-admin-btn" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">👑 تعيين أدمن</button>`;
                }

                const memberStatus = user.isMember ? '✓ عضو' : '❌ ليس عضو';

                div.innerHTML = `
                    <div>
                        <div style="font-weight: bold; color: #333;">${user.name || 'مستخدم'}</div>
                        <div style="color: #666; font-size: 12px;">${user.email}</div>
                        <div style="color: #888; font-size: 11px;">${memberStatus}</div>
                    </div>
                    <div>${buttonHtml}</div>
                `;

                resultsContainer.appendChild(div);
            });

        } catch (error) {
            console.error('خطأ في البحث:', error);
            resultsContainer.innerHTML = '<p style="text-align: center; color: #f44336; padding: 10px;">حدث خطأ أثناء البحث</p>';
        }
    }, 400));

    input.focus();

    // إضافة event listener لإغلاق النافذة
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
        modal.remove();
    });

    // إغلاق النافذة عند الضغط خارجها
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// تحديث دالة toggle admin - محدثة للأدمن
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('toggle-admin-btn')) {
        const userId = e.target.dataset.user;
        const groupId = e.target.dataset.group;
        
        try {
            // التحقق من الصلاحيات
            const groupDoc = await db.collection('groupNames').doc(groupId).get();
            if (!groupDoc.exists) return;

            const groupData = groupDoc.data();
            const isOwner = groupData.ownerId === currentUser.uid;
            const admins = groupData.admins || [];
            const isAdmin = admins.includes(currentUser.uid);

            // جلب صلاحيات المستخدم الحالي
            const userPermissions = await getUserPermissions(currentUser.uid);
            const { isSuperAdmin, isOwner: isOwnerRole } = userPermissions;
            const hasHighPermissions = isSuperAdmin || isOwnerRole;

            // التحقق من الصلاحيات
            if (!isOwner && !isAdmin && !hasHighPermissions) {
                alert('ليس لديك صلاحية لإدارة الأدمن في هذه المجموعة');
                return;
            }

            const groupRef = db.collection('groupNames').doc(groupId);

            if (admins.includes(userId)) {
                // إزالة من الأدمن
                await groupRef.update({
                    admins: firebase.firestore.FieldValue.arrayRemove(userId)
                });
                e.target.textContent = '👑 تعيين أدمن';
                e.target.style.background = '#4CAF50';
                showGroupNotification('تم إزالة الأدمن بنجاح', 'success');
            } else {
                // إضافة كأدمن وإضافته للمجموعة إذا لم يكن عضواً
                await groupRef.update({
                    admins: firebase.firestore.FieldValue.arrayUnion(userId)
                });

                // إضافة المستخدم للمجموعة إذا لم يكن عضواً
                const groupMembersRef = db.collection('groups').doc(groupId);
                const groupMembersDoc = await groupMembersRef.get();
                
                if (!groupMembersDoc.exists) {
                    await groupMembersRef.set({
                        members: [userId],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    const members = groupMembersDoc.data().members || [];
                    if (!members.includes(userId)) {
                        await groupMembersRef.update({
                            members: firebase.firestore.FieldValue.arrayUnion(userId)
                        });
                    }
                }

                e.target.textContent = '🚫 إزالة أدمن';
                e.target.style.background = '#f44336';
                showGroupNotification('تم تعيين الأدمن بنجاح وإضافته للمجموعة', 'success');
            }
        } catch (error) {
            console.error('خطأ في تغيير صلاحية الأدمن:', error);
            alert('حدث خطأ أثناء تغيير صلاحية الأدمن');
        }
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function loadPrivateChat(otherUserId, otherUserEmail) {
    if (messagesListener) {
        messagesListener();
    }

    document.querySelectorAll('.group-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.user-item').forEach(item => item.classList.remove('active'));
    
    document.querySelector(`[data-user="${otherUserId}"]`).classList.add('active');

    const chatId = [currentUser.uid, otherUserId].sort().join('_');
    currentChat = chatId;
    currentChatType = 'private';
    currentGroupInfo = null;
    
    chatHeader.textContent = `💬 ${otherUserEmail}`;
    messagesContainer.innerHTML = '';

    const inputArea = document.getElementById("input_area");
    document.getElementById("showRequestsBtn").setAttribute("style", "display: block !important;");
    inputArea.style.display = 'flex';
    messageInput.disabled = false;
    messageInput.placeholder = "اكتب رسالتك هنا...";
    sendBtn.disabled = false;

    messagesListener = db.collection('privateChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            messagesContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                displayMessage(doc.data(), doc.id);
            });

            requestAnimationFrame(scrollToBottom);
        });
    
    
}
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.getElementById('recordingStatus');

    if (isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        statusText.textContent = '';
    } else {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();

                    reader.onloadend = () => {
                        const base64Audio = reader.result;

                        const messageData = {
                            senderId: currentUser.uid,
                            senderEmail: currentUser.email,
                            text: '',
                            audioBase64: base64Audio,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            deleted: false,
                            edited: false
                        };

                        const collectionPath = currentChatType === 'group'
                            ? db.collection('groups').doc(currentChat).collection('messages')
                            : db.collection('privateChats').doc(currentChat).collection('messages');

                        collectionPath.add(messageData)
                            .catch(err => console.error('خطأ في إرسال الصوت:', err));
                    };

                    reader.readAsDataURL(audioBlob);
                };

                mediaRecorder.start();
                isRecording = true;
                statusText.textContent = '🔴 جاري التسجيل...';
            })
            .catch(err => {
                console.error('فشل الوصول للمايكروفون:', err);
                alert('تعذر الوصول للميكروفون. تأكد من أنك منحت الإذن.');
            });
    }
}






// دالة لتمييز المنشنز بخلفية حمراء
function highlightMentions(messageText) {
    if (!messageText) return messageText;
    
    // البحث عن المنشنز وتمييزها
    const mentionRegex = /@(\w+)/g;
    
    return messageText.replace(mentionRegex, (match) => {
        return `<span style="background-color: #213D4B; color: #35B3E4; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${match}</span>`;
    });
}

function displayMessage(messageData, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.setAttribute('data-message-id', messageId);

    // إذا الرسالة إعلان خليها مميزة
    if (messageData.type === 'announcement') {
        messageDiv.classList.add('announcement');
    } else {
        if (messageData.senderId === currentUser.uid) {
            messageDiv.classList.add('own');
        }
    }

    const senderName = messageData.type === 'announcement' 
        ? '📢 إعلان من الإدارة'
        : (messageData.senderEmail || 'مجهول');

    // ★ إصلاح: التحقق من وجود timestamp
    const messageTime = messageData.timestamp && messageData.timestamp.toDate ? 
        new Date(messageData.timestamp.toDate()).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        }) : 'الآن';

    const isOwnMessage = messageData.senderId === currentUser.uid;
    const showActions = isOwnMessage && messageData.type !== 'announcement';
    const isDeleted = messageData.deleted === true;

    // ★ تحديث: نظام إشارات الحالة المحسن
    let messageStatus = '';
    if (isOwnMessage && messageData.type !== 'announcement') {
        // الحالة الافتراضية إذا لم تكن هناك بيانات حالة
        let status = messageData.status || 'sent';
        
        // ★ إصلاح: التحقق من وجود timestamp قبل استخدامه
        let messageAge = 0;
        if (messageData.timestamp && messageData.timestamp.toDate) {
            messageAge = Date.now() - messageData.timestamp.toDate().getTime();
        }
        
        if (status === 'sent' && messageAge > 2000) {
            status = 'delivered';
            // تحديث الحالة في قاعدة البيانات
            updateMessageStatus(messageId, 'delivered');
        }
        
        switch (status) {
            case 'sent':
                messageStatus = '<span class="message-status sent">✓</span>';
                break;
            case 'delivered':
                messageStatus = '<span class="message-status delivered">✓✓</span>';
                break;
            case 'read':
                messageStatus = '<span class="message-status read">✓✓<span style="color:#2196F3;">●</span></span>';
                break;
            default:
                messageStatus = '<span class="message-status sending">⏳</span>';
        }
    }

    // ★ الجديد: تمييز المنشنز في النص
    const displayText = isDeleted ? 'تم حذف هذه الرسالة' : 
        (messageData.text ? highlightMentions(messageData.text) : '');
    const editableText = isDeleted ? '' : (messageData.text || '');

    let contentHTML = `<div class="message-text">${displayText}</div>`;

    if (!isDeleted && messageData.type !== 'announcement') {
        if (messageData.imageBase64) {
            contentHTML += `
                <img src="${messageData.imageBase64}"
                    alt="صورة"
                    loading="lazy"
                    style="max-width: 250px; max-height: 250px; display: block; margin-top: 5px; border-radius: 8px; cursor: pointer;"
                    onclick="openMediaViewer('${messageData.imageBase64}', 'image')"
                    onerror="this.style.display='none';" />
            `;
        }
        if (messageData.videoBase64) {
            contentHTML += `
                <video controls preload="metadata"
                    style="max-width: 300px; max-height: 300px; display: block; margin-top: 5px; border-radius: 8px;"
                    onerror="this.style.display='none';">
                    <source src="${messageData.videoBase64}" type="video/mp4" />
                    متصفحك لا يدعم تشغيل الفيديو.
                </video>
            `;
        }
        if (messageData.audioBase64) {
            contentHTML += `
                <audio controls preload="metadata"
                    style="display: block; margin-top: 8px; width: 250px;"
                    onerror="this.style.display='none';">
                    <source src="${messageData.audioBase64}" type="audio/webm" />
                    متصفحك لا يدعم تشغيل الصوت.
                </audio>
            `;
        }
    }

    if (messageData.type === 'file' && messageData.fileBase64) {
        const fileSize = messageData.fileSize || 'غير معروف'; 
        contentHTML += `
            <div class="button1">
                <a href="${messageData.fileBase64}" download="${messageData.fileName}">
                    ⬇️ تحميل ${messageData.fileName}
                </a>
                <b class="top">click to download</b>
                <b class="bottom">${fileSize}</b>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-sender">${senderName}${messageData.edited ? ' (معدلة)' : ''}</div>
        ${contentHTML}
        <input type="text" class="edit-input" value="${editableText}">
        <div class="edit-controls">
            <button class="save-edit-btn" onclick="saveMessageEdit('${messageId}')">حفظ</button>
            <button class="cancel-edit-btn" onclick="cancelMessageEdit('${messageId}')">إلغاء</button>
        </div>
        <div class="message-time">
            ${messageTime}
            ${messageStatus}
        </div>
        ${showActions && !isDeleted ? `
            <div class="message-actions">
                <button class="action-btn edit-btn" onclick="startEditMessage('${messageId}')">✏️</button>
                <button class="action-btn delete-btn" onclick="deleteMessage('${messageId}')">🗑️</button>
            </div>
        ` : ''}
    `;

    if (isDeleted) {
        messageDiv.classList.add('deleted');
    }

    messagesContainer.appendChild(messageDiv);
}

// دالة معالجة اختيار الوسائط
function handleMediaInput() {
    const mediaInput = document.getElementById('mediaInput');
    const file = mediaInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            showMediaPreview(e.target.result, file.type, file.name);
        };
        reader.readAsDataURL(file);
    }
}

// دالة عرض معاينة الوسائط
function showMediaPreview(dataUrl, fileType, fileName, fileSize = 'غير معروف') {
    const previewContainer = document.getElementById('mediaPreview') || createMediaPreviewContainer();
    
    let previewHTML = '';

    if (fileType.startsWith('image/')) {
        previewHTML = `<img src="${dataUrl}" alt="معاينة الصورة" style="max-width: 200px; max-height: 200px; border-radius: 8px;">`;
    } else if (fileType.startsWith('video/')) {
        previewHTML = `<video src="${dataUrl}" controls style="max-width: 200px; max-height: 200px; border-radius: 8px;"></video>`;
    } else if (fileType.startsWith('audio/')) {
        previewHTML = `<audio src="${dataUrl}" controls style="width: 200px;"></audio>`;
    } else {
        // لأي نوع ملف آخر نعرض رابط تحميل
        previewHTML = `
            <div class="file-download">
                <a href="${dataUrl}" download="${fileName}">⬇️ تحميل ${fileName}</a>
                <div class="file-size">${fileSize}</div>
            </div>
        `;
    }
    
    previewContainer.innerHTML = `
        <div class="media-preview-header">
            <span>معاينة الملف:</span>
            <button id="remove_btn" class="remove-media-btn" onclick="clearMediaInput()">✕</button>
        </div>
        <div class="media-preview-item">
            ${previewHTML}
            <div class="media-info">${fileName}</div>
        </div>
    `;
    
    previewContainer.style.display = 'block';
}


// إنشاء حاوي معاينة الوسائط
function createMediaPreviewContainer() {
    const container = document.createElement('div');
    container.id = 'mediaPreview';
    container.className = 'media-preview-container';
    
    // إدراج الحاوي قبل منطقة الإدخال
    const inputArea = document.querySelector('.input-area') || document.body;
    inputArea.parentNode.insertBefore(container, inputArea);
    
    return container;
}

// دالة مسح اختيار الوسائط
function clearMediaInput() {
    const mediaInput = document.getElementById('mediaInput');
    const previewContainer = document.getElementById('mediaPreview');
    
    if (mediaInput) {
        mediaInput.value = '';
    }
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
}

// دالة فتح عارض الوسائط
function openMediaViewer(src, type) {
    const viewer = document.createElement('div');
    viewer.className = 'media-viewer';
    viewer.onclick = function(e) {
        if (e.target === viewer) {
            document.body.removeChild(viewer);
        }
    };
    
    let content = '';
    if (type === 'image') {
        content = `<img src="${src}" style="max-width: 90vw; max-height: 90vh;">`;
    } else if (type === 'video') {
        content = `<video src="${src}" controls style="max-width: 90vw; max-height: 90vh;">`;
    }
    
    viewer.innerHTML = `
        <div class="media-viewer-content">
            <button class="remove-media-btn" onclick="document.body.removeChild(this.closest('.media-viewer'))">✕</button>
            ${content}
        </div>
    `;
    
    document.body.appendChild(viewer);
}

// إضافة مستمع الأحداث للمدخل
document.addEventListener('DOMContentLoaded', function() {
    const mediaInput = document.getElementById('mediaInput');
    if (mediaInput) {
        mediaInput.addEventListener('change', handleMediaInput);
    }
});

// CSS للتنسيق
const styles = `
<style>
.message-status {
    margin-left: 5px;
    font-size: 12px;
}

.message-status.sent {
    color: #999;
}

.message-status.delivered {
    color: #4CAF50;
}

.message-status.read {
    color: #2196F3;
}

.message-status.sending {
    color: #FFC107;
}

.media-preview-container {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
    display: none;
}

.media-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: bold;
}

.remove-media-btn {
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-media-btn:hover {
    background: #cc0000;
}

.media-preview-item {
    text-align: center;
}

.media-info {
    margin-top: 5px;
    font-size: 12px;
    color: #666;
    word-break: break-all;
}

.media-viewer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.media-viewer-content {
    position: relative;
}

.close-viewer {
    position: absolute;
    top: -40px;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;

}

.close-viewer:hover {
    background: #f0f0f0;
}
</style>
`;

// إضافة الأنماط للصفحة
if (!document.getElementById('message-system-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'message-system-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
}   


// بدء التعديل
function startEditMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    const input = messageDiv.querySelector('.edit-input');
    const editControls = messageDiv.querySelector('.edit-controls');

    input.style.display = 'block';
    editControls.style.display = 'flex';

    const messageText = messageDiv.querySelector('.message-text');
    if (messageText) messageText.style.display = 'none';
}

// إلغاء التعديل
function cancelMessageEdit(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    const input = messageDiv.querySelector('.edit-input');
    const editControls = messageDiv.querySelector('.edit-controls');
    const messageText = messageDiv.querySelector('.message-text');

    input.style.display = 'none';
    editControls.style.display = 'none';
    if (messageText) messageText.style.display = 'block';
}

// حفظ التعديل
function saveMessageEdit(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    const input = messageDiv.querySelector('.edit-input');
    const newText = input.value.trim();

    if (newText === '') return alert('لا يمكن ترك الرسالة فارغة');

    db.collection('messages').doc(messageId).update({
        text: newText,
        edited: true
    }).then(() => {
        cancelMessageEdit(messageId);
    }).catch((error) => {
        console.error('خطأ في تعديل الرسالة:', error);
    });
}

// حذف الرسالة
function deleteMessage(messageId) {
    if (!confirm('هل أنت متأكد أنك تريد حذف هذه الرسالة؟')) return;

    db.collection('messages').doc(messageId).update({
        deleted: true
    }).then(() => {
        console.log('تم حذف الرسالة');
    }).catch((error) => {
        console.error('خطأ في حذف الرسالة:', error);
    });
}






function startEditMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    messageDiv.classList.add('editing');
    const editInput = messageDiv.querySelector('.edit-input');
    editInput.focus();
    editInput.select();
}

async function saveMessageEdit(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    const editInput = messageDiv.querySelector('.edit-input');
    const newText = editInput.value.trim();
    
    if (!newText) {
        alert('لا يمكن أن تكون الرسالة فارغة');
        return;
    }
    
    try {
        let docRef;
        if (currentChatType === 'group') {
            docRef = db.collection('groups').doc(currentChat).collection('messages').doc(messageId);
        } else {
            docRef = db.collection('privateChats').doc(currentChat).collection('messages').doc(messageId);
        }
        
        const messageDoc = await docRef.get();
        if (!messageDoc.exists) {
            alert('الرسالة غير موجودة');
            return;
        }
        
        const messageData = messageDoc.data();
        if (messageData.senderId !== currentUser.uid) {
            alert('لا يمكنك تعديل رسائل الآخرين');
            return;
        }
        
        await docRef.update({
            text: newText,
            edited: true,
            editedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        messageDiv.classList.remove('editing');
        showGroupNotification('تم تعديل الرسالة بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في تعديل الرسالة:', error);
        alert('حدث خطأ أثناء تعديل الرسالة');
    }
}

function cancelMessageEdit(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;
    
    messageDiv.classList.remove('editing');
    
    const messageTextElement = messageDiv.querySelector('.message-text');
    const originalText = messageTextElement ? messageTextElement.textContent.trim() : '';
    
    const editInput = messageDiv.querySelector('.edit-input');
    if (editInput && originalText !== 'تم حذف هذه الرسالة') {
        editInput.value = originalText;
    }
}

async function deleteMessage(messageId) {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
        return;
    }
    
    try {
        let docRef;
        if (currentChatType === 'group') {
            docRef = db.collection('groups').doc(currentChat).collection('messages').doc(messageId);
        } else {
            docRef = db.collection('privateChats').doc(currentChat).collection('messages').doc(messageId);
        }
        
        const messageDoc = await docRef.get();
        if (!messageDoc.exists) {
            alert('الرسالة غير موجودة');
            return;
        }
        
        const messageData = messageDoc.data();
        if (messageData.senderId !== currentUser.uid) {
            alert('لا يمكنك حذف رسائل الآخرين');
            return;
        }
        
        
        await docRef.update({
            deleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            text: 'تم حذف هذه الرسالة',
            imageBase64: firebase.firestore.FieldValue.delete()  // حذف الصورة
        });
        
        showGroupNotification('تم حذف الرسالة بنجاح', 'info');
        
    } catch (error) {
        console.error('خطأ في حذف الرسالة:', error);
        alert('حدث خطأ أثناء حذف الرسالة');
    }
}


async function findUserIdByTarget(target) {
    // 1. جرب مباشرة كـ userId
    const directDoc = await db.collection('users').doc(target).get();
    if (directDoc.exists) return target;

    // 2. جرب بالايمايل
    const emailQuery = await db.collection('users').where('email', '==', target).get();
    if (!emailQuery.empty) return emailQuery.docs[0].id;

    // 3. جرب بالاسم
    const nameQuery = await db.collection('users').where('name', '==', target).get();
    if (!nameQuery.empty) return nameQuery.docs[0].id;

    return null;
}

function hideInputArea() {
    document.getElementById('input_area').style.display = 'none';
    document.getElementById("showRequestsBtn").style.display="none"
}

function showInputArea() {
    document.getElementById('input_area').style.display = 'flex';
    document.getElementById("showRequestsBtn").setAttribute("style", "display: block !important;");

}

function showBlockedMessage(msg) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = `
        <div style="padding: 20px; color: #c00; background: #fee; border-radius: 8px; text-align: center;">
            ${msg}
        </div>
    `;
}
function parseDuration(str) {
  const m = str.match(/^(\d+)([smhd])$/);
  if (!m) return 0;
  const val = parseInt(m[1], 10);
  const unit = m[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
  }
  return 0;
}

async function canSendMessage() {
    if (!currentChat) return false;

    if (currentChatType === 'group') {
        const groupDoc = await db.collection('groupNames').doc(currentChat).get();
        if (!groupDoc.exists) return false;

        const groupData = groupDoc.data();
        const isOwner = groupData.ownerId === currentUser.uid;
        const isAdmin = (groupData.admins || []).includes(currentUser.uid);

        // 🚫 تحقق من القفل
        if (groupData.locked && !isOwner && !isAdmin) {
            showBlockedMessage("🔒 تم قفل المجموعة مؤقتًا من قبل الإدارة.");
            hideInputArea();
            return false;
        }

        // 🚫 تحقق من العضوية
        if (groupData.private && !(groupData.members || []).includes(currentUser.uid)) {
            showBlockedMessage("🚫 أنت لست عضوًا في هذه المجموعة.");
            hideInputArea();
            return false;
        }

        // 🚫 تحقق من الحظر
        if ((groupData.bannedUsers || []).includes(currentUser.uid)) {
            showBlockedMessage("🚫 تم حظرك من هذه المجموعة.");
            hideInputArea();
            return false;
        }

        // 🔇 تحقق من الكتم
        const muteUntil = (groupData.mutes || {})[currentUser.uid];
        if (muteUntil && Date.now() < muteUntil) {
            const endTime = new Date(muteUntil);
            const formattedTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            showBlockedMessage(`🔇 تم كتمك حتى الساعة: ${formattedTime} بتاريخ ${endTime.toLocaleDateString()}`);
            hideInputArea();
            return false;
        }

        // ✅ فك الكتم التلقائي (إن انتهى وقته)
        if (muteUntil && Date.now() >= muteUntil) {
            await db.collection('groupNames').doc(currentChat).update({
                [`mutes.${currentUser.uid}`]: firebase.firestore.FieldValue.delete()
            });
        }

        clearBlockedMessage();
        showInputArea();
        return true;

    } else {
        // محادثة خاصة
        clearBlockedMessage();
        showInputArea();
        return true;
    }
}

function clearBlockedMessage() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.innerHTML = ''; // إزالة الرسالة التحذيرية
    }
}

const lastMessageTimestamps = {}; // userId => timestamp (ميلي ثانية)
// ★ إضافة متغيرات جديدة لنظام الـ popup
let mentionNotificationListener = null;

const input = document.getElementById('messageInput');
const mentionsList = document.getElementById('mentionsList');
let users = [];

// ★ دالة إنشاء popup الإشعار
function createMentionPopup(notificationData) {
    // إزالة أي popup موجود مسبقاً
    const existingPopup = document.getElementById('mentionPopup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // إنشاء عنصر الـ popup
    const popup = document.createElement('div');
    popup.id = 'mentionPopup';
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        font-family: 'Arial', sans-serif;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        transition: transform 0.2s ease;
    `;

    // إضافة CSS animation
    if (!document.getElementById('popupStyles')) {
        const style = document.createElement('style');
        style.id = 'popupStyles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            #mentionPopup:hover {
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);
    }




    // محتوى الـ popup
    popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; font-size: 16px; font-weight: bold;">
                📢تمت الاشارة اليك 
            </h4>
            <button id="closePopup" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>
        <div style="margin-bottom: 8px;">
            <strong>من:</strong> ${notificationData.senderName}
        </div>
        <div style="margin-bottom: 8px;">
                <strong>في:</strong> ${notificationData.chatType === 'group' ? notificationData.chatName || "مجموعة"  : 'المحادثة الخاصة'}
        </div>
        <div style="
            background: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        ">
            "${notificationData.message}"
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
            ${new Date(notificationData.timestamp).toLocaleTimeString('ar-EG')}
        </div>
    `;

    // إضافة الـ popup للصفحة
    document.body.appendChild(popup);


// تشغيل الصوت
const mentionSound = new Audio('men.mp3');
mentionSound.play().catch(() => {});

// إضافة event listeners
const closeBtn = popup.querySelector('#closePopup');
closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closePopup();
    stopSound();
});

// عند النقر على الـ popup ينقلك للدردشة
popup.addEventListener('click', () => {
    if (notificationData.chatType === 'group') {
        openGroupChat(notificationData.chatId);
    } else {
        openPrivateChat(notificationData.chatId);
    }
    closePopup();
    stopSound();
    markMentionAsRead(notificationData.docId);
});

// دالة إيقاف الصوت
function stopSound() {
    mentionSound.pause();
    mentionSound.currentTime = 0;
}


    // إخفاء الـ popup تلقائياً بعد 8 ثواني
    setTimeout(() => {
        closePopup();
    }, 9100);

    // دالة إغلاق الـ popup
    function closePopup() {
        if (popup && popup.parentNode) {
            popup.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }
    }
}

// ★ دالة مراقبة الإشعارات الجديدة
function startMentionNotificationListener() {
    if (!currentUser || mentionNotificationListener) return;

    mentionNotificationListener = db.collection('mentions')
        .where('userId', '==', currentUser.uid)
        .where('read', '==', false)
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notificationData = change.doc.data();
                    notificationData.docId = change.doc.id;
                    
                    // عرض الـ popup فقط للإشعارات الجديدة
                    const notificationAge = Date.now() - notificationData.timestamp;
                    if (notificationAge < 60000) { // أحدث من دقيقة
                        createMentionPopup(notificationData);
                    }
                }
            });
        });
}

// ★ دالة إيقاف مراقبة الإشعارات
function stopMentionNotificationListener() {
    if (mentionNotificationListener) {
        mentionNotificationListener();
        mentionNotificationListener = null;
    }
}

// ★ دالة تحديد الإشعار كمقروء
async function markMentionAsRead(docId) {
    try {
        await db.collection('mentions').doc(docId).update({
            read: true
        });
    } catch (error) {
        console.error('خطأ في تحديد الإشعار كمقروء:', error);
    }
}




async function loadUserss() {
    try {
      const snapshot = await db.collection('users').get();
      

      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        
      });
      
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        // يرجع username أو name حسب الحقل الموجود عندك
        return (data.username || data.name || '').toLowerCase();
      }).filter(u => u.length > 0);
      
     
    } catch (e) {
      console.error('فشل جلب المستخدمين:', e);
    }
}

loadUserss();

input.addEventListener('input', () => {
    const caretPos = input.selectionStart;
    const textBeforeCaret = input.value.slice(0, caretPos);

    const atIndex = textBeforeCaret.lastIndexOf('@');
    if (atIndex === -1) {
      mentionsList.style.display = 'none';
      return;
    }

    const query = textBeforeCaret.slice(atIndex + 1).toLowerCase();

    if (query.length === 0) {
      showMentions(users);
    } else {
      const filtered = users.filter(u => u.startsWith(query));
      if (filtered.length > 0) {
        showMentions(filtered);
      } else {
        mentionsList.style.display = 'none';
      }
    }
});

function showMentions(list) {
    mentionsList.innerHTML = '';
    list.forEach(user => {
      const div = document.createElement('div');
      div.textContent = user;
      div.style.padding = '5px 10px';
      div.style.cursor = 'pointer';
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectMention(user);
      });
      mentionsList.appendChild(div);
    });
    const rect = input.getBoundingClientRect();
    mentionsList.style.top = (rect.bottom + window.scrollY) + 'px';
    mentionsList.style.left = (rect.left + window.scrollX) + 'px';
    mentionsList.style.width = rect.width + 'px';
    mentionsList.style.display = 'block';
}

function selectMention(user) {
    const caretPos = input.selectionStart;
    const text = input.value;
    const atIndex = text.lastIndexOf('@', caretPos - 1);
    if (atIndex === -1) return;
    const before = text.slice(0, atIndex + 1);
    const after = text.slice(caretPos);
    input.value = before + user + ' ' + after;
    input.focus();
    const newPos = (before + user + ' ').length;
    input.setSelectionRange(newPos, newPos);
    mentionsList.style.display = 'none';
}

input.addEventListener('blur', () => {
    setTimeout(() => { mentionsList.style.display = 'none'; }, 200);
});

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.getElementById('mediaInput');
    setTimeout(() => {
        scrollToBottom();
    }, 100);
    let text = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) return;
    if (!currentChat) return;

    // تعريف collectionRef هنا
    const collectionRef = currentChatType === 'group'
        ? db.collection('groups').doc(currentChat).collection('messages')
        : db.collection('privateChats').doc(currentChat).collection('messages');

    if (currentChatType === 'group') {
        const groupDoc = await db.collection('groupNames').doc(currentChat).get();
        if (groupDoc.exists) {
            const groupData = groupDoc.data();
            const bannedUsers = groupData.bannedUsers || [];
            const locked = groupData.locked || false;
            const isOwner = groupData.ownerId === currentUser.uid;
            const admins = groupData.admins || [];
            const isAdmin = admins.includes(currentUser.uid);

            // 🚫 حظر
            if (bannedUsers.includes(currentUser.uid)) {
                showBlockedMessage("🚫 تم حظرك من هذه المجموعة ولا يمكنك إرسال الرسائل.");
                hideInputArea();
                return;
            }

            // 🔒 المجموعة مقفولة
            if (locked && !isOwner && !isAdmin) {
                showBlockedMessage("🔒 هذه المجموعة مقفولة حاليًا ولا يمكنك إرسال الرسائل.");
                hideInputArea();
                return;
            }

            // الكتم
            const mutes = groupData.mutes || {};
            if (mutes[currentUser.uid] && Date.now() < mutes[currentUser.uid]) {
                alert('أنت مكتوم ولا يمكنك إرسال رسائل الآن.');
                return;
            }

            const slowmodeSeconds = groupData.slowmodeSeconds || 0;

            // تحقق slowmode للأعضاء العاديين فقط
            if (!isOwner && !isAdmin && slowmodeSeconds > 0) {
                const now = Date.now();
                const lastSent = lastMessageTimestamps[currentUser.uid] || 0;
                const diffSeconds = (now - lastSent) / 1000;

                if (diffSeconds < slowmodeSeconds) {
                    alert(`⏳ الرجاء الانتظار ${Math.ceil(slowmodeSeconds - diffSeconds)} ثانية قبل إرسال رسالة جديدة.`);
                    return;
                }
            }
        }
    }

    // جلب بيانات الجروب (لو القروب)
    let groupInfo = null;
    let isOwner = false;
    let isAdmin = false;
    if (currentChatType === 'group') {
        const groupInfoDoc = await db.collection('groupNames').doc(currentChat).get();
        if (groupInfoDoc.exists) {
            groupInfo = groupInfoDoc.data();
            isOwner = groupInfo.ownerId === currentUser.uid;
            const admins = groupInfo.admins || [];
            isAdmin = admins.includes(currentUser.uid);
        }
    }

    // جلب دور المستخدم
    let userRole = 'user';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            userRole = userDoc.data().role || 'user';
        }
    } catch (error) {
        console.warn('فشل في جلب دور المستخدم:', error);
    }
    const isSuperAdmin = userRole === 'superadmin';

    function isAdminOrOwner() {
        return isOwner || isAdmin || isSuperAdmin;
    }

    // إذا النص يبدأ بأمر "/"
    if (text.startsWith('/')) {
        if (!isAdminOrOwner()) {
            alert('ليس لديك صلاحية تنفيذ الأوامر.');
            return;
        }

        const parts = text.slice(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        // معالجة الأوامر
        if (command === 'ban') {
            if (args.length === 0) {
                alert('يرجى تحديد المستخدم للحظر');
                return;
            }
            const targetUserIdOrEmail = args[0];
            const userId = await findUserIdByTarget(targetUserIdOrEmail);
            if (!userId) {
                alert('المستخدم غير موجود');
                return;
            }

            await db.collection('groupNames').doc(currentChat).update({
                bannedUsers: firebase.firestore.FieldValue.arrayUnion(userId),
                members: firebase.firestore.FieldValue.arrayRemove(userId),
                admins: firebase.firestore.FieldValue.arrayRemove(userId)
            });

            alert(`تم حظر المستخدم ${targetUserIdOrEmail}`);
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'unban') {
            if (args.length === 0) {
                alert('يرجى تحديد المستخدم لفك الحظر');
                return;
            }
            const targetUserIdOrEmail = args[0];
            const userId = await findUserIdByTarget(targetUserIdOrEmail);
            if (!userId) {
                alert('المستخدم غير موجود');
                return;
            }

            await db.collection('groupNames').doc(currentChat).update({
                bannedUsers: firebase.firestore.FieldValue.arrayRemove(userId)
            });

            alert(`✅ تم فك الحظر عن المستخدم ${targetUserIdOrEmail}`);
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'lock') {
            await db.collection('groupNames').doc(currentChat).update({
                locked: true
            });

            alert("✅ تم قفل المجموعة. الأعضاء لا يمكنهم إرسال الرسائل.");
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'unlock') {
            await db.collection('groupNames').doc(currentChat).update({
                locked: false
            });

            alert("🔓 تم فتح المجموعة. يمكن للأعضاء إرسال الرسائل الآن.");
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'mute') {
            if (args.length < 2) {
                alert('يرجى تحديد المستخدم ومدة الكتم');
                return;
            }

            const targetUserIdOrEmail = args[0];
            const durationStr = args[1];

            const userId = await findUserIdByTarget(targetUserIdOrEmail);
            if (!userId) {
                alert('المستخدم غير موجود');
                return;
            }

            const durationMs = parseDuration(durationStr);
            if (!durationMs) {
                alert('مدة الكتم غير صحيحة');
                return;
            }

            const muteUntil = Date.now() + durationMs;

            await db.collection('groupNames').doc(currentChat).update({
                [`mutes.${userId}`]: muteUntil
            });

            alert(`تم كتم المستخدم ${targetUserIdOrEmail} لمدة ${durationStr}`);
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'unmute') {
            if (args.length === 0) {
                alert('يرجى تحديد المستخدم لفك الكتم');
                return;
            }
            const targetUserIdOrEmail = args[0];
            const userId = await findUserIdByTarget(targetUserIdOrEmail);
            if (!userId) {
                alert('المستخدم غير موجود');
                return;
            }

            await db.collection('groupNames').doc(currentChat).update({
                [`mutes.${userId}`]: firebase.firestore.FieldValue.delete()
            });

            alert(`✅ تم فك الكتم عن المستخدم ${targetUserIdOrEmail}`);
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'clear') {
            if (!isAdminOrOwner()) {
                alert('ليس لديك صلاحية تنفيذ الأوامر.');
                return;
            }

            const collectionRef = currentChatType === 'group'
                ? db.collection('groups').doc(currentChat).collection('messages')
                : db.collection('privateChats').doc(currentChat).collection('messages');

            const snapshot = await collectionRef.get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            alert('✅ تم حذف جميع الرسائل.');
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'stats') {
            if (!isAdminOrOwner()) {
                alert('ليس لديك صلاحية تنفيذ الأوامر.');
                return;
            }

            const groupDoc = await db.collection('groupNames').doc(currentChat).get();
            if (!groupDoc.exists) {
                alert('المجموعة غير موجودة.');
                return;
            }

            const groupData = groupDoc.data();
            const membersCount = (groupData.members || []).length;
            const adminsCount = (groupData.admins || []).length;
            const bannedCount = (groupData.bannedUsers || []).length;
            const muteCount = Object.keys(groupData.mutes || {}).length;
            const locked = groupData.locked ? 'نعم' : 'لا';

            alert(`
إحصائيات المجموعة:
- الأعضاء: ${membersCount}
- الأدمنز: ${adminsCount}
- المحظورين: ${bannedCount}
- المكتومين: ${muteCount}
- المجموعة مقفولة؟: ${locked}
    `);

            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'slowmode') {
            if (!isAdminOrOwner()) {
                alert('ليس لديك صلاحية تنفيذ الأوامر.');
                return;
            }

            if (args.length === 0) {
                alert('يرجى تحديد مدة التأخير بالثواني (0 لتعطيل السلوومود).');
                return;
            }

            const seconds = parseInt(args[0]);
            if (isNaN(seconds) || seconds < 0) {
                alert('مدة غير صحيحة.');
                return;
            }

            await db.collection('groupNames').doc(currentChat).update({
                slowmodeSeconds: seconds
            });

            alert(seconds === 0 ? 'تم تعطيل وضع السلوومود.' : `تم تفعيل السلوومود بفاصل ${seconds} ثانية.`);

            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'help') {
            let helpMessage = `🛠️ قائمة الأوامر:\n`;

            if (isAdminOrOwner()) {
                helpMessage += `
/ban [المعرف] - حظر مستخدم من المجموعة
/unban [المعرف] - فك الحظر عن مستخدم
/mute [المعرف] [المدة] - كتم مستخدم (مثال: 10m)
/unmute [المعرف] - فك الكتم عن مستخدم
/lock - قفل المجموعة
/unlock - فتح المجموعة
/clear - حذف جميع الرسائل
/stats - عرض إحصائيات المجموعة
/slowmode [ثواني] - تفعيل وضع البطء
/help - عرض هذه القائمة
/announce - لعمل اعلان`;
            } else {
                helpMessage += `
/stats - عرض إحصائيات المجموعة
/help - عرض هذه القائمة`;
            }

            alert(helpMessage);
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        if (command === 'announce') {
            if (!isOwner && !isAdmin && !isSuperAdmin) {
                alert('❌ هذا الأمر فقط للمالك أو الأدمن أو SuperAdmin.');
                return;
            }

            const announcementText = args.join(' ').trim();
            if (!announcementText) {
                alert('❌ الرجاء كتابة نص الإعلان بعد الأمر.');
                return;
            }

            const announcementMessage = {
                type: 'announcement',
                text: announcementText,
                groupId: currentChat,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                senderId: currentUser.uid,
                status: 'sent' // ★ إضافة الحالة للإعلانات أيضاً
            };

            await db.collection('groups').doc(currentChat).collection('messages').add(announcementMessage);

            alert('✅ تم إرسال الإعلان بنجاح.');
            messageInput.value = '';
            fileInput.value = '';
            return;
        }

        alert('أمر غير معروف. اكتب /help لعرض الأوامر.');
        return;
    }

    // ★ فحص المنشنز في النص
    const mentionedUsers = [];
    if (text) {
        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex);
        
        if (matches) {
            for (const match of matches) {
                const mentionedUsername = match.substring(1).toLowerCase();
       
                try {
                    let userQuery = await db.collection('users')
                        .where('username', '==', mentionedUsername)
                        .limit(1)
                        .get();

                    if (userQuery.empty) {
                        userQuery = await db.collection('users')
                            .where('name', '==', mentionedUsername)
                            .limit(1)
                            .get();
                    }

                    if (userQuery.empty) {
                        userQuery = await db.collection('users')
                            .where('displayName', '==', mentionedUsername)
                            .limit(1)
                            .get();
                    }

                    if (userQuery.empty) {
                        const allUsersSnapshot = await db.collection('users').get();
                        
                        allUsersSnapshot.docs.forEach(doc => {
                            const userData = doc.data();
                            const usernames = [
                                userData.username,
                                userData.name,
                                userData.displayName,
                                userData.email
                            ].map(u => u ? u.toLowerCase() : '');
                            
                            if (usernames.includes(mentionedUsername)) {
                                if (!mentionedUsers.find(u => u.userId === doc.id)) {
                                    mentionedUsers.push({
                                        userId: doc.id,
                                        username: mentionedUsername,
                                        displayName: userData.displayName || userData.username || userData.name || mentionedUsername
                                    });
                                }
                            }
                        });
                        continue;
                    }

                    if (!userQuery.empty) {
                        const mentionedUserId = userQuery.docs[0].id;
                        const userData = userQuery.docs[0].data();
                        
                        if (!mentionedUsers.find(u => u.userId === mentionedUserId)) {
                            mentionedUsers.push({
                                userId: mentionedUserId,
                                username: mentionedUsername,
                                displayName: userData.displayName || userData.username || mentionedUsername
                            });
                        }
                    } else {
                        console.clear();
                    }
                } catch (e) {
                    console.error('خطأ في البحث عن المستخدم:', mentionedUsername, e);
                }
            }
        }
    }

    // ★ إعداد بيانات الرسالة مع نظام الإشارات
    const messageData = {
        senderId: currentUser.uid,
        senderEmail: currentUser.displayName || currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deleted: false,
        edited: false,
        status: 'sent' // ★ الحالة الابتدائية - مرسل
    };

    // ★ إضافة المنشنز إذا وجدت
    if (mentionedUsers.length > 0) {
        messageData.mentions = mentionedUsers.map(m => ({
            userId: m.userId,
            username: m.username,
            displayName: m.displayName
        }));
    }

    if (text) {
        messageData.text = text;
    }

    // ★ دالة إرسال إشعارات المنشن
    async function sendMentionNotifications() {
        try {
            for (const mention of mentionedUsers) {
                const notificationData = {
                    userId: mention.userId,
                    chatId: currentChat,
                    chatType: currentChatType,
                    senderId: currentUser.uid,
                    senderName: currentUser.displayName || currentUser.email,
                    message: text ? text.substring(0, 100) : 'صورة/فيديو',
                    timestamp: Date.now(),
                    read: false
                };

                await db.collection('mentions').add(notificationData);
            }
        } catch (error) {
            console.error('خطأ في إرسال إشعارات المنشن:', error);
        }
    }

    // ★ إرسال الرسالة مع الملف أو بدونه
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;

            let fileType = 'file';
            if (file.type.startsWith('image/')) fileType = 'imageBase64';
            else if (file.type.startsWith('video/')) fileType = 'videoBase64';
            else if (file.type.startsWith('audio/')) fileType = 'audioBase64';

            messageData[fileType] = base64Data;

            if (!['imageBase64','videoBase64','audioBase64'].includes(fileType)) {
                messageData.type = 'file';
                messageData.fileName = file.name;
                messageData.fileBase64 = base64Data;
                messageData.fileSize = formatFileSize(file.size);
            }

            try {
                const messageDocRef = await collectionRef.add(messageData);

                if (mentionedUsers.length > 0) {
                    await sendMentionNotifications();
                }

                lastMessageTimestamps[currentUser.uid] = Date.now();
                messageInput.value = '';
                fileInput.value = '';
                
                // ★ تحديث الحالة إلى "مستلمة" بعد ثانيتين
                setTimeout(async () => {
                    await updateMessageStatus(messageDocRef.id, 'delivered');
                }, 2000);
                
            } catch (err) {
                console.error('فشل إرسال الرسالة:', err);
            }
        };
        reader.readAsDataURL(file);
    } else {
        try {
            const messageDocRef = await collectionRef.add(messageData);

            if (mentionedUsers.length > 0) {
                await sendMentionNotifications();
            }

            lastMessageTimestamps[currentUser.uid] = Date.now();
            messageInput.value = '';
            fileInput.value = '';
            
            // ★ تحديث الحالة إلى "مستلمة" بعد ثانيتين
            setTimeout(async () => {
                await updateMessageStatus(messageDocRef.id, 'delivered');
            }, 2000);
            
        } catch (err) {
            console.error('فشل إرسال الرسالة:', err);
        }
    }

    // ★ مسح معاينة الوسائط بعد الإرسال
    clearMediaInput();
}

// ★ دالة مساعدة لتحديث حالة الرسالة
async function updateMessageStatus(messageId, status) {
    try {
        let docRef;
        if (currentChatType === 'group') {
            docRef = db.collection('groups').doc(currentChat).collection('messages').doc(messageId);
        } else {
            docRef = db.collection('privateChats').doc(currentChat).collection('messages').doc(messageId);
        }
        
        await docRef.update({
            status: status,
            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ تم تحديث حالة الرسالة ${messageId} إلى: ${status}`);
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الرسالة:', error);
    }
}

// ★ دالة مساعدة لتحويل مدة الكتم
function parseDuration(str) {
    const m = str.match(/^(\d+)([smhd])$/);
    if (!m) return 0;
    const val = parseInt(m[1], 10);
    const unit = m[2];
    switch (unit) {
        case 's': return val * 1000;
        case 'm': return val * 60 * 1000;
        case 'h': return val * 60 * 60 * 1000;
        case 'd': return val * 24 * 60 * 60 * 1000;
    }
    return 0;
}

// ★ دالة مساعدة لإيجاد المستخدم
async function findUserIdByTarget(target) {
    const directDoc = await db.collection('users').doc(target).get();
    if (directDoc.exists) return target;

    const emailQuery = await db.collection('users').where('email', '==', target).get();
    if (!emailQuery.empty) return emailQuery.docs[0].id;

    const nameQuery = await db.collection('users').where('name', '==', target).get();
    if (!nameQuery.empty) return nameQuery.docs[0].id;

    return null;
}

// ★ دالة مساعدة لتنسيق حجم الملف
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    else return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

// ★ دوال إضافية لتشغيل وإيقاف نظام الإشعارات

// استدعي هذه الدالة عند تسجيل الدخول أو فتح التطبيق
function initializeMentionSystem() {
    if (currentUser) {
        startMentionNotificationListener();
    }
}

// استدعي هذه الدالة عند تسجيل الخروج أو إغلاق التطبيق
function cleanupMentionSystem() {
    stopMentionNotificationListener();
    // إخفاء أي popup مفتوح
    const existingPopup = document.getElementById('mentionPopup');
    if (existingPopup) {
        existingPopup.remove();
    }

}

// ★ دالة مساعدة محدثة لتحديث حالة الرسالة
async function updateMessageStatus(messageId, status) {
    try {
        let docRef;
        if (currentChatType === 'group') {
            docRef = db.collection('groups').doc(currentChat).collection('messages').doc(messageId);
        } else {
            docRef = db.collection('privateChats').doc(currentChat).collection('messages').doc(messageId);
        }
        
        // التحقق من وجود المستند أولاً
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.warn('⚠️ الرسالة غير موجودة:', messageId);
            return;
        }
        
        await docRef.update({
            status: status,
            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ تم تحديث حالة الرسالة ${messageId} إلى: ${status}`);
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الرسالة:', error);
        // تجاهل أخطاء الفهرس مؤقتاً
        if (error.message.includes('index')) {
            console.warn('⚠️ تحتاج لإنشاء الفهرس في Firebase Console');
        }
    }
}

// ★ دالة جديدة: تحديث حالة الرسائل كمقروءة
async function markMessagesAsRead() {
    if (!currentChat || !currentUser) return;
    
    try {
        let query;
        if (currentChatType === 'group') {
            query = db.collection('groups').doc(currentChat).collection('messages')
                .where('senderId', '!=', currentUser.uid);
        } else {
            query = db.collection('privateChats').doc(currentChat).collection('messages')
                .where('senderId', '!=', currentUser.uid);
        }
        
        const snapshot = await query.get();
        
        const batch = db.batch();
        let hasUpdates = false;
        
        snapshot.forEach(doc => {
            const messageData = doc.data();
            // تحديث فقط الرسائل التي ليست مقروءة بعد
            if (messageData.status !== 'read') {
                const docRef = doc.ref;
                batch.update(docRef, {
                    status: 'read',
                    readAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readBy: currentUser.uid
                });
                hasUpdates = true;
            }
        });
        
        if (hasUpdates) {
            await batch.commit();
            console.log(`✅ تم تحديث الرسائل كمقروءة`);
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة القراءة:', error);
        // تجاهل خطأ الفهرس مؤقتاً
        if (!error.message.includes('index')) {
            console.error('خطأ غير متوقع:', error);
        }
    }
}

// ★ دالة جديدة: مراقبة التمرير وتحديث الحالة
function setupReadStatusObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const messageDiv = entry.target;
                const messageId = messageDiv.getAttribute('data-message-id');
                
                // تحديث الحالة كمقروءة إذا كانت الرسالة ليست من المستخدم الحالي
                const isOwnMessage = messageDiv.classList.contains('own');
                if (!isOwnMessage) {
                    updateMessageStatus(messageId, 'read');
                }
            }
        });
    }, { threshold: 0.5 }); // عندما يكون 50% من الرسالة مرئية
    
    // مراقبة جميع الرسائل الجديدة
    const observerCallback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('message')) {
                        observer.observe(node);
                    }
                });
            }
        }
    };
    
    const messagesObserver = new MutationObserver(observerCallback);
    messagesObserver.observe(messagesContainer, { childList: true });
}

// ★ دالة للحصول على عدد الإشعارات غير المقروءة
async function getUnreadMentionsCount() {
    if (!currentUser) return 0;
    
    try {
        const snapshot = await db.collection('mentions')
            .where('userId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('خطأ في جلب عدد الإشعارات:', error);
        return 0;
    }
}

// ★ دالة لجلب جميع الإشعارات
async function getAllMentions(limit = 50) {
    if (!currentUser) return [];
    
    try {
        const snapshot = await db.collection('mentions')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('خطأ في جلب الإشعارات:', error);
        return [];
    }
}

// ★ دالة لتحديد جميع الإشعارات كمقروءة
async function markAllMentionsAsRead() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('mentions')
            .where('userId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        console.log('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
        console.error('خطأ في تحديد الإشعارات كمقروءة:', error);
    }
}

// ★ دالة لحذف إشعار معين
async function deleteMention(mentionId) {
    try {
        await db.collection('mentions').doc(mentionId).delete();
        console.log('تم حذف الإشعار');
    } catch (error) {
        console.error('خطأ في حذف الإشعار:', error);
    }
}

// ★ مثال على كيفية استخدام النظام:
/*


// لعرض عدد الإشعارات في شريط التنقل:
async function updateNotificationBadge() {
    const count = await getUnreadMentionsCount();
    const badge = document.getElementById('mentionBadge');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// لإنشاء صفحة إشعارات:
async function showMentionsPage() {
    const mentions = await getAllMentions();
    // عرض الإشعارات في واجهة المستخدم
}
*/







function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    else return (bytes/(1024*1024)).toFixed(1) + ' MB';
}




sendBtn.addEventListener('click', async () => {
    await sendMessage();
    clearMediaInput()
});

messageInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        await sendMessage();
        clearMediaInput()
    document.getElementById("mediaInput").value=""
    document.getElementById("messageInput").value=""

    }
});

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}



messageInput.focus();

function resetPassword() {
    const resetEmail = document.getElementById("resetEmail").value.trim();
    if (!resetEmail) {
        alert("الرجاء إدخال بريد إلكتروني صحيح.");
        return;
    }

    auth
        .sendPasswordResetEmail(resetEmail)
        .then(() => alert("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني."))
        .catch((err) => alert("خطأ: " + err.message));
}

const checkbox = document.getElementById('toggleCheckbox');
const label = document.getElementById('toggleLabel');

if (checkbox && label) {
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            label.src ="off.png";
            passwordInput.type="text"
        } else {
            label.src ="on.png";
            passwordInput.type="password"
        }
    });
}

function displayUser(userId, userName, isOnline) {
    const statusColor = isOnline ? 'green' : 'gray';
    const userItem = document.createElement('div');
    userItem.className = 'user-item';

    userItem.innerHTML = `
        <span class="user-name">${userName}</span>
        <span id="status-${userId}" class="status-dot" style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${statusColor};margin-right:5px;"></span>
    `;
    document.getElementById("usersList").appendChild(userItem);
}



document.getElementById("sendBtn").addEventListener("click",function() {
    document.getElementById("mediaInput").value=""
    document.getElementById("messageInput").value=""
    clearMediaInput()
})

const createGroupBtn = document.getElementById('createGroupBtn');
const createGroupModal = document.getElementById('createGroupModal');
const newGroupPrivateCheckbox = document.getElementById('newGroupPrivate');

// عناصر المودال
createGroupBtn.addEventListener('click', () => {
    createGroupModal.style.display = 'flex'; // يظهر المودال
    overlay.style.display = 'block';        // يظهر Overlay
});
const closeModalBtn = document.getElementById('closeModalBtn');


closeModalBtn.addEventListener('click', () => {
    createGroupModal.style.display = 'none';
    overlay.style.display = 'none';
});


const overlay = document.getElementById('overlay');
const step1 = document.getElementById('groupStep1');
const step2 = document.getElementById('groupStep2');
const nextBtn = document.getElementById('groupNextBtn');
const sideImage = document.getElementById('groupSideImage');

// حقول Step 2
const newGroupNameInput = document.getElementById('newGroupNameInput');
const newGroupDescription = document.getElementById('newGroupDescription');
const cancelGroupBtn = document.getElementById('cancelGroupBtn');
const saveGroupBtn = document.getElementById('saveGroupBtn');

// صور Templates
const templateImages = {
  branch: 'branch.png',
  project: 'project.jpg',
  friends: 'friends.jpg'
};



// NEXT: الانتقال من Step1 → Step2
nextBtn.addEventListener('click', () => {
    const selected = step1.querySelector('input[name="groupTemplate"]:checked');
    if(!selected) {
        alert('يرجى اختيار نوع القناة أولًا');
        return;
    }

    // تغيير الصورة الجانبية
    sideImage.src = templateImages[selected.value] || 'placeholder.png';

    // إظهار Step2 وإخفاء Step1
    step1.style.display = 'none';
    step2.style.display = 'block';
});

// إغلاق المودال
function closeModal() {
    createGroupModal.style.display = 'none';
    overlay.style.display = 'none';
    step1.style.display = 'block';
    step2.style.display = 'none';
    newGroupNameInput.value = '';

}

// إغلاق عند الضغط على إلغاء أو overlay
cancelGroupBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

// حفظ القروب عند الضغط على إنشاء
saveGroupBtn.addEventListener('click', async () => {
    const groupName = newGroupNameInput.value.trim();
    const selectedTemplate = step1.querySelector('input[name="groupTemplate"]:checked')?.value;
    const isPrivate = step2.querySelector('input[name="newGroupPrivacy"]:checked')?.value === 'private';
    const privacyInput = step2.querySelector('input[name="newGroupPrivacy"]:checked');
 

    if(!groupName) {
        alert('يرجى إدخال اسم القروب');
        return;
    }
        if (!privacyInput) {
        alert('يرجى اختيار نوع الخصوصية: عام أو خاص');
        return;
    }

    try {
        await db.collection('groupNames').doc(groupName).set({
            name: groupName,
            private: isPrivate,
            template: selectedTemplate || '',
            ownerId: currentUser.uid,
            admins: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showGroupNotification(`تم إنشاء القروب "${groupName}" بنجاح!`, 'success');
        closeModal();

    } catch(error) {
        console.error('خطأ في إنشاء القروب:', error);
        alert('حدث خطأ أثناء إنشاء القروب.');
    }
});


function closeJoinRequestsModal() {
    document.getElementById('joinRequestsModal').style.display = 'none';
}
function openJoinRequestsModal() {
    document.getElementById('joinRequestsModal').style.display = 'block';
}

function close_modal(){
    requestsModal.style.display="none"
    document.getElementById("modalOverlay").style.display="none"
}

function listenJoinRequests() {
    if (!currentUser) return;
    
    db.collection('joinRequests')
        .where('status', '==', 'pending')
        .onSnapshot(async (snapshot) => {
            const ownedGroupsSnapshot = await db.collection('groupNames')
                .where('ownerId', '==', currentUser.uid)
                .get();

            const adminGroupsSnapshot = await db.collection('groupNames')
                .where('admins', 'array-contains', currentUser.uid)
                .get();
            
            const allGroupIds = new Set();
            ownedGroupsSnapshot.docs.forEach(doc => allGroupIds.add(doc.id));
            adminGroupsSnapshot.docs.forEach(doc => allGroupIds.add(doc.id));
            
            let pendingRequestsCount = 0;
            
            snapshot.forEach((doc) => {
                const request = doc.data();
                if (allGroupIds.has(request.groupId)) {
                    pendingRequestsCount++;
                }
            });
            
            updateJoinRequestsCounter(pendingRequestsCount);
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const request = change.doc.data();
                    if (allGroupIds.has(request.groupId)) {
                        showGroupNotification(`طلب انضمام جديد من ${request.userName}`, 'info');
                    }
                }
            });
        });
}

function updateJoinRequestsCounter(count) {
    const showRequestsBtn = document.getElementById('showRequestsBtn');
    if (showRequestsBtn) {
        if (count > 0) {
            // تغيير النص إلى صورة مع الاحتفاظ بالعداد
            showRequestsBtn.innerHTML = `📋 ${count}`;
            showRequestsBtn.style.background = '#ff4444';
        } else {
            showRequestsBtn.innerHTML = '📋';
            showRequestsBtn.style.background = '';
        }
    }
}

window.addEventListener("beforeunload", () => {
    if (auth.currentUser) {
        const userStatusRef = rtdb.ref('/usersStatus/' + auth.currentUser.uid);
        userStatusRef.set({
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP
        });
    }
});




async function measurePing(url = "https://taqat-gpt.netlify.app") {
  const start = performance.now();
  try {
    await fetch(url, { cache: "no-cache", mode: "no-cors" });
    const end = performance.now();
    return Math.round(end - start);
  } catch {
    return null;
  }
}

// مثال استخدام وعرض ping في div
const pingDiv = document.createElement('div');
pingDiv.style.position = 'fixed';
pingDiv.style.bottom = '10px';
pingDiv.style.right = '20px';
pingDiv.style.padding = '5px 10px';
pingDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
pingDiv.style.color = 'white';
pingDiv.style.fontFamily = 'monospace';
pingDiv.style.scale="1.2"
pingDiv.style.zIndex = '9999';
document.body.appendChild(pingDiv);

async function updatePing() {
  const ping = await measurePing();
  if (ping !== null) {
    pingDiv.textContent = `Ping: ${ping} ms`;
  } else {
    pingDiv.textContent = `Ping: غير متصل`;
  }
  setTimeout(updatePing, 500); // حدث كل 5 ثواني
}
updatePing();







// نظام الإشعارات - أضف هذا في نهاية الملف

// دالة إظهار popup الإشعار
function showMentionPopup(notification) {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        cursor: pointer;
        transform: translateX(350px);
        transition: all 0.3s ease;
        font-family: Arial, sans-serif;
    `;

    popup.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">
            📢 منشن جديد
        </div>
        <div style="font-size: 14px; margin-bottom: 5px;">
            من: ${notification.senderName || 'مجهول'}
        </div>
        <div style="font-size: 12px;">
            ${notification.message || ''}
        </div>
    `;

    document.body.appendChild(popup);

    // أنيميشن الدخول
    setTimeout(() => {
        popup.style.transform = 'translateX(0)';
    }, 100);

    // إخفاء عند النقر
    popup.addEventListener('click', () => {
        popup.style.transform = 'translateX(350px)';
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    });

    // إخفاء تلقائي بعد 5 ثواني
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.transform = 'translateX(350px)';
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }
    }, 5000);
}

// مراقبة الإشعارات الجديدة
function setupMentionListener() {
    if (!currentUser) {
        console.warn('currentUser غير معرف، تأكد من تسجيل الدخول أولاً');
        return;
    }

    db.collection('mentions')
      .where('userId', '==', currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snapshot => {
          snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                  const notification = change.doc.data();
                  const docId = change.doc.id;

                  console.log('جاء منشن جديد:', notification);

                  showMentionPopup(notification);

                  // تحديث الإشعار كمقروء
                  db.collection('mentions').doc(docId).update({
                      read: true
                  }).catch(err => {
                      console.error('خطأ في تحديث حالة القراءة:', err);
                  });
              }
          });
      }, error => {
          console.error('حدث خطأ في استماع الإشعارات:', error);
      });
}

// تشغيل مراقب الإشعارات
// أضف هذا في المكان الذي يتم فيه تسجيل الدخول
function initMentionSystem() {
    if (currentUser) {
        setupMentionListener();
    } else {
        console.warn('المستخدم غير مسجل دخول بعد');
    }
}

// إذا كان عندك firebase auth listener، أضف السطر التالي داخله:
// initMentionSystem();

const usersMap = new Map();

async function loadAllUsersForMentions() {
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        // نستخدم الاسم في البحث
        if (userData.name) {
            usersMap.set(userData.name.toLowerCase(), doc.id);
        }
    });
}





loadAllUsersForMentions()





// إضافة الدوال كـ global functions
window.acceptJoinRequest = acceptJoinRequest;
window.rejectJoinRequest = rejectJoinRequest;
window.resetPassword = resetPassword;
window.startEditMessage = startEditMessage;
window.saveMessageEdit = saveMessageEdit;
window.cancelMessageEdit = cancelMessageEdit;
window.deleteMessage = deleteMessage;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.openFriendRequestsModal = openFriendRequestsModal;
window.closeFriendRequestsModal = closeFriendRequestsModal;
window.openGroupMembersModal = openGroupMembersModal;
window.closeGroupMembersModal = closeGroupMembersModal;
window.openInviteUsersModal = openInviteUsersModal;
window.closeInviteUsersModal = closeInviteUsersModal;
window.inviteUserToGroup = inviteUserToGroup;
window.removeMemberFromGroup = removeMemberFromGroup;                                       
