/**
 * JavaScript yang diinjeksikan ke dalam WebView LMS.
 * Bertanggung jawab mengekstrak data dari Moodle Web Services dan mendeteksi status autentikasi.
 */
export const LMS_INJECTED_SCRIPT = `
(function() {
  try {
    if (!window.location.hostname.includes('lms.uinjakarta.id')) {
      return;
    }

    // Jika terlempar ke halaman login
    if (window.location.pathname.includes('/login/')) {
      // Periksa apakah ini mode headless yang terlempar kembali ke login
      if (window.__KUDU_HEADLESS__) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LMS_SESSION_EXPIRED'
          }));
        }
        return;
      }

      // Cari tombol Google SSO
      var googleBtn = document.querySelector('a[href*="auth/oauth2/login.php?id=1"]');
      if (googleBtn) {
        googleBtn.style.display = 'block';
        googleBtn.style.backgroundColor = '#ffde59';
        googleBtn.style.color = '#000000';
        googleBtn.style.border = '3px solid #000000';
        googleBtn.style.fontWeight = '900';
        googleBtn.style.padding = '14px';
        googleBtn.style.borderRadius = '12px';
        googleBtn.style.boxShadow = '4px 4px 0px #000000';
        googleBtn.style.textAlign = 'center';
        googleBtn.style.fontSize = '16px';

        // Auto-redirect ke Google Login setelah halaman siap
        setTimeout(function() {
          googleBtn.click();
        }, 400);
      }
      return;
    }

    // Jika berada di halaman LMS setelah login
    var sesskey = window.M && window.M.cfg ? window.M.cfg.sesskey : null;
    var userId = window.M && window.M.cfg ? window.M.cfg.userId : 0;
    
    // Ambil nama pengguna dan avatar dari DOM
    var userTextEl = document.querySelector('.usertext, .usermenu .userbutton, .user-name');
    var userName = userTextEl ? userTextEl.innerText.trim() : '';
    
    var userImgEl = document.querySelector('.userpicture, .avatars img');
    var userAvatar = userImgEl ? userImgEl.src : '';

    async function fetchMoodleData() {
      var courses = [];
      var assignments = [];

      // 1. Fetch Courses via official Moodle AJAX service
      if (sesskey) {
        try {
          var courseRes = await fetch('/lib/ajax/service.php?sesskey=' + encodeURIComponent(sesskey) + '&info=core_course_get_enrolled_courses_by_timeline_classification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify([{
              index: 0,
              methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
              args: { offset: 0, limit: 0, classification: 'all', sort: 'fullname' }
            }])
          });
          var courseJson = await courseRes.json();
          if (Array.isArray(courseJson) && courseJson[0] && courseJson[0].data && courseJson[0].data.courses) {
            courses = courseJson[0].data.courses.map(function(c) {
              return {
                id: c.id,
                fullname: c.fullname,
                shortname: c.shortname,
                progress: typeof c.progress === 'number' ? c.progress : null,
                hasprogress: !!c.hasprogress,
                completed: !!c.completed,
                courseimage: c.courseimage || '',
                viewurl: c.viewurl || ('https://lms.uinjakarta.id/course/view.php?id=' + c.id),
                coursecategory: c.coursecategory || ''
              };
            });
          }
        } catch (errCourse) {
          console.error('Course fetch failed:', errCourse);
        }

        // 2. Fetch Assignments & Deadlines via official Moodle AJAX service
        try {
          var now = Math.floor(Date.now() / 1000);
          var calRes = await fetch('/lib/ajax/service.php?sesskey=' + encodeURIComponent(sesskey) + '&info=core_calendar_get_action_events_by_timesort', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify([{
              index: 0,
              methodname: 'core_calendar_get_action_events_by_timesort',
              args: { timesortfrom: now - 86400, limitnum: 30 }
            }])
          });
          var calJson = await calRes.json();
          if (Array.isArray(calJson) && calJson[0] && calJson[0].data && calJson[0].data.events) {
            assignments = calJson[0].data.events.map(function(ev) {
              return {
                id: ev.id,
                name: ev.name,
                activityname: ev.activityname || ev.name,
                modulename: ev.modulename || 'assign',
                course: ev.course ? {
                  id: ev.course.id,
                  fullname: ev.course.fullname,
                  shortname: ev.course.shortname
                } : null,
                timesort: ev.timesort,
                formattedtime: ev.formattedtime || '',
                action: ev.action ? {
                  name: ev.action.name,
                  url: ev.action.url
                } : null,
                overdue: !!ev.overdue,
                isactionevent: !!ev.isactionevent
              };
            });
          }
        } catch (errCal) {
          console.error('Calendar fetch failed:', errCal);
        }
      }

      // Kirim hasil sinkronisasi ke React Native
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LMS_SYNC_SUCCESS',
          payload: {
            user: {
              id: userId,
              name: userName,
              avatar: userAvatar
            },
            courses: courses,
            assignments: assignments,
            sesskey: sesskey,
            syncedAt: Date.now()
          }
        }));
      }
    }

    // Jalankan sinkronisasi
    fetchMoodleData();
  } catch (globalErr) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LMS_SYNC_ERROR',
        error: globalErr.toString()
      }));
    }
  }
})();
true;
`;
