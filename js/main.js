// تهيئة الخريطة وتحديد المركز ومستوى التكبير الافتراضي
var map = L.map('map').setView([23.8859, 45.0792], 6);

// إضافة طبقة الخريطة (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

// إضافة علامات للسدود
var dams = [
    { id: 1, name: "سد 1", coords: [22.8859, 44.0792] },
    { id: 2, name: "سد 2", coords: [25.8859, 47.0792] }
];

dams.forEach(function (dam) {
    L.marker(dam.coords).addTo(map)
        .bindPopup(`<b>${dam.name}</b>`);

    // إضافة السد إلى القوائم المنسدلة
    var option1 = new Option(dam.name, dam.id);
    var option2 = new Option(dam.name, dam.id);
    document.getElementById('dam1').appendChild(option1);
    document.getElementById('dam2').appendChild(option2);
});

// مصفوفة لتخزين جميع المسارات
var allPolylines = [];

// إضافة مسار بين السدين المحددين
document.getElementById('drawPath').addEventListener('click', function () {
    var dam1Id = document.getElementById('dam1').value;
    var dam2Id = document.getElementById('dam2').value;

    if (dam1Id && dam2Id) {
        var dam1 = dams.find(d => d.id == dam1Id);
        var dam2 = dams.find(d => d.id == dam2Id);

        if (dam1 && dam2) {
            // رسم المسار بين السدين
            var polyline = L.polyline([dam1.coords, dam2.coords], { color: 'red' }).addTo(map);
            map.fitBounds(polyline.getBounds()); // تحريك الخريطة لتعرض المسار بشكل كامل
            // إضافة label للمسار عند الضغط عليه
            polyline.bindPopup(`<b>المسار بين ${dam1.name} و${dam2.name}</b>`).openPopup();
            // تخزين المسار في المصفوفة
            allPolylines.push(polyline);
        }
    } else {
        alert('يرجى اختيار سدين لإنشاء المسار.');
    }
});

// قائمة للاحتفاظ بالنقاط المضافة
var points = [];

// إضافة علامة بناءً على إدخال المستخدم
document.getElementById('addMarker').addEventListener('click', function () {
    var lat = parseFloat(document.getElementById('lat').value);
    var lng = parseFloat(document.getElementById('lng').value);

    // التحقق من صحة الإحداثيات
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        var marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>علامة جديدة</b> في (${lat}, ${lng})`).openPopup();
        map.setView([lat, lng], 10); // تحريك الخريطة لعرض العلامة الجديدة

        // إضافة النقطة إلى القائمة
        points.push([lat, lng]);
    } else {
        alert('يرجى إدخال إحداثيات صحيحة.');
    }
});

// رسم المسار عند الضغط على زر "Find Route"
document.getElementById('findRoute').addEventListener('click', function () {
    if (points.length > 1) {
        // إزالة المسار القديم إذا كان موجودًا
        if (polyline) {
            map.removeLayer(polyline);
        }

        // رسم المسار الجديد
        var polyline = L.polyline(points, { color: 'red' }).addTo(map);
        map.fitBounds(polyline.getBounds()); // تحريك الخريطة لتعرض المسار بشكل كامل

        // تخزين المسار في المصفوفة
        allPolylines.push(polyline);
    } else {
        alert('يجب إضافة نقطتين على الأقل لرسم المسار.');
    }
});

// زر لحذف جميع المسارات المرسومة
document.getElementById('deleteRoute').addEventListener('click', function () {
    if (allPolylines.length > 0) {
        allPolylines.forEach(function (polyline) {
            map.removeLayer(polyline); // إزالة المسار من الخريطة
        });
        allPolylines = []; // إعادة تعيين المصفوفة
    } else {
        alert('لا توجد مسارات لحذفها.');
    }
});

// إضافة علامات لبحيرات التخزين
var lakes = [
    { name: "بحيرة 1", coords: [24.8859, 45.0792] },
    { name: "بحيرة 2", coords: [23.8859, 46.0792] }
];

lakes.forEach(function (lake) {
    L.marker(lake.coords).addTo(map)
        .bindPopup(`<b>${lake.name}</b>`);
});

// ##################################### Excel File ###############################################

// متغير لتخزين البيانات بعد تحميل ملف Excel
let excelData = [];
let markers = [];  // لتخزين كل العلامات المضافة
let currentPolyline = null; // لتخزين المسار المرسوم

// دالة لعرض الرسالة في div
function showMessage(message, isSuccess = true) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = `<p style="color: ${isSuccess ? 'green' : 'red'}">${message}</p>`;
    setTimeout(() => { messageContainer.innerHTML = ''; }, 5000); // إخفاء الرسالة بعد 5 ثوانٍ
}

// دالة لمعالجة تحميل الملف
function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            try {
                processWorkbook(workbook);
                showMessage("تم تحميل البيانات بنجاح", true);
            } catch (error) {
                console.error("خطأ في قراءة البيانات:", error);
                showMessage("لم يتم الإضافة، يُرجى التأكد من البيانات", false);
            }
        };
        reader.readAsArrayBuffer(file); // قراءة الملف كـ ArrayBuffer
    } else {
        showMessage("لم يتم تحديد ملف", false);
    }
}

// دالة لمعالجة البيانات من ملف Excel
function processWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0]; // اختيار أول ورقة في الملف
    const sheet = workbook.Sheets[sheetName];
    excelData = XLSX.utils.sheet_to_json(sheet);
    console.log(excelData);  // عرض البيانات في الكونسول
}

// دالة للتحقق من أسماء الأعمدة واستخدام الصحيح منها
function getLatLng(row) {
    const possibleLatNames = ['lat', 'Lat', 'latitude', 'Latitude', 'X', 'x'];
    const possibleLngNames = ['lng', 'long', 'Lng', 'Long', 'longitude', 'Longitude', 'Y', 'y'];

    let lat, lng;

    // البحث عن الأعمدة الصحيحة للإحداثيات
    for (let latName of possibleLatNames) {
        if (row.hasOwnProperty(latName)) {
            lat = row[latName];
            break;
        }
    }

    for (let lngName of possibleLngNames) {
        if (row.hasOwnProperty(lngName)) {
            lng = row[lngName];
            break;
        }
    }

    return { lat, lng };
}

// دالة لإضافة النقاط إلى الخريطة
function addPointsToMap() {
    if (excelData.length === 0) {
        showMessage("لم يتم الإضافة، يُرجى التأكد من البيانات", false);
        return;
    }

    let hasError = false; // للتحقق مما إذا كانت هناك أخطاء في الإحداثيات

    excelData.forEach((row, index) => {
        const { lat, lng } = getLatLng(row);

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            let marker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>Row ${index + 1}</b><br>إحداثيات: ${lat}, ${lng}`);
            markers.push(marker);
        } else {
            console.warn(`لم يتم العثور على إحداثيات صحيحة في الصف ${index + 1}`);
            hasError = true;
        }
    });

    if (hasError) {
        showMessage("تم إضافة النقاط الصحيحة، لكن بعض النقاط تحتوي على أخطاء.", false);
    } else {
        showMessage("تمت إضافة جميع النقاط بنجاح.", true);
    }
}

// دالة لحذف جميع النقاط من الخريطة
function removeAllMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);  // حذف العلامة من الخريطة
    });
    markers = [];  // تفريغ المصفوفة بعد حذف جميع العلامات

    if (currentPolyline) {
        map.removeLayer(currentPolyline);  // حذف المسار من الخريطة إذا كان موجودًا
        currentPolyline = null;
    }

    showMessage("تم حذف جميع النقاط من الخريطة بنجاح.");
}

// دالة لإيجاد المسار بين النقاط التي تمت إضافتها
function findRoute() {
    if (markers.length < 2) {
        showMessage("يجب إضافة نقطتين على الأقل لرسم المسار.", false);
        return;
    }

    // إزالة المسار القديم إذا كان موجودًا
    if (currentPolyline) {
        map.removeLayer(currentPolyline);
    }

    // الحصول على جميع الإحداثيات من العلامات
    let latlngs = markers.map(marker => marker.getLatLng());

    // رسم المسار الجديد
    currentPolyline = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(currentPolyline.getBounds()); // تحريك الخريطة لتعرض المسار بالكامل
}

// ربط دالة تحميل الملف مع الـ input الخاص بتحميل الملفات
document.getElementById('fileInput').addEventListener('change', handleFile);

// ربط زر "إضافة النقاط" بدالة إضافة النقاط إلى الخريطة
document.getElementById('addPointsButton').addEventListener('click', addPointsToMap);

// ربط زر "حذف النقاط" بدالة حذف النقاط
document.getElementById('removePointsButton').addEventListener('click', removeAllMarkers);

// ربط زر "إيجاد المسار" بدالة إيجاد المسار بين النقاط
document.getElementById('findRouteButton').addEventListener('click', findRoute);