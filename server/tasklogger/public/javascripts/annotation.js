var url_ajax_tasks = '/users/ajax_tasks';

$(document).ready(function(){
    //Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();
    
    //show the counts
    get_counts();

    //load the tasks
    load_tasks();

    //when click on accomplished tasks
    $('#link_done').click(function(){
        $('#div_planlist').addClass('archive_area');
        $('#li_done').addClass('active');
        $('#li_todo').removeClass('active');
        $('#plan_options').addClass('hidden');
        load_done_tasks();
    });    

    //when click on my plan and tasks
    $('#link_todo').click(function(){
        $('#div_planlist').removeClass('archive_area');
        $('#li_todo').addClass('active');
        $('#li_done').removeClass('active');
        $('#plan_options').removeClass('hidden');
        load_tasks();
    });

    // Click on a main-task-text to show/hide subtasks
    $('#div_planlist').on('click', '.main-task-with-subtask', function(){
        $('[parent='+$(this).attr('id').split('_')[3]+']').toggleClass('hidden');
    });

    //Add a main task
    $('#input_addtask').keyup(function(e){
        //Type a task and press Enter
        if (e.keyCode == 13){
            var create_time = (new Date()).getTime();
            add_task({'level': 0, 'parent': 0, 
                'time_create': create_time, 
                'task': $('#input_addtask').val(),
                });
        }
    });

    //Add subtask: show the inputbox
    $('#div_planlist').on('click', '.add-subtask', function(){
        var main_task_id = $(this).attr('id').split('_')[2];
        var input_id = '#add_subtask_container_'+main_task_id;
        $(input_id).toggleClass('hidden');
        if (!$(input_id).hasClass('hidden'))
            $('#add_subtask_input_'+main_task_id).focus();
    });

    //Add a subtask
    $('#div_planlist').on('keyup', '.subtask-input', function(e){
        if (e.keyCode == 13){
            param = {
                'time_create': (new Date()).getTime(),
                'parent': $(this).attr('id').split('_')[3],
                'level': 1,
                'task': $(this).val(),
            }
            add_task(param);
        }
    });

    // Remove an item
    $('#div_planlist').on('click', '.rm-item', function(){
        var task_id = $(this).attr('id').split('_')[1];
        var to_remove = [task_id];
        //if it's a parent, then all its subtasks should be removed
        if ($('#'+task_id).hasClass('main-task')){
            var subtasks = $('[parent='+ task_id +']');
            for (var i = 0; i < subtasks.length; i++)
                to_remove.push(subtasks[i].id)
        }
        remove_item(to_remove);
    });

    //TODO: Tick out a task that is done
    //Set the task done time, css
    //but does not set the "done" status
    //"done" status is for when the task is achived to "done"
    // Note: in archived "done" page, only subtask uncheck is possible
    // Once uncheck, it's removed from the archive
    $('#div_planlist').on('click', ':checkbox', function(){
        var task_id = $(this).attr('id').split('_')[1];
        var checked = $(this).is(':checked');
        var time_done = (new Date()).getTime();
        var area = 'todo';
        if ($('#div_planlist').hasClass('archive_area'))
            area = 'archive';
 
        var change = [task_id]
        if ($('#' + task_id).hasClass('main-task')){
            var subtasks = $('[parent=' + task_id + ']');
            if (checked){
               //if a main task is done, then all its subtasks should be done
               for (var i = 0; i<subtasks.length; i++)
                    change.push(subtasks[i].id);
               //all items have the same done_time
            }
            else{
                //if a main task is undone, then the subtasks that were done
                //at the same time should be undone
                for (var i = 0; i<subtasks.length; i++){
                    if (subtasks[i].getAttribute('time_done') == $('#' + task_id).attr('time_done'))
                       change.push(subtasks[i].id);
                }
                //all item time_done should be 0
                time_done = 0
            }
        }
        else{
            var main_task = $('#'+task_id).attr('parent');
            if (checked){
                //the subtask is done, and all others are done
                //set the main_task also to done
                var all_checked = true;
                var subtasks = $('[parent=' + main_task + ']');
                for(var i = 0; i<subtasks.length; i++){
                    if (subtasks[i].id == task_id)
                        continue
                    if (subtasks[i].getAttribute('time_done') == 0)
                        all_checked = false;
                }
                if (subtasks.length > 0 && all_checked)
                    change.push(main_task)
                //main_task has the same time_done as the last item
            }
            else{
                //if uncheck a subtask, and the main_task was checked
                //then should uncheck it too
                if ($('#' + main_task).attr('time_done')>0)
                    change.push(main_task)
                //main_task and the subtask has time_done to 0
                time_done = 0
            }
        }
        change_status(change, time_done, area);
    });

    //TODO: refresh a done task
    //TODO: move done tasks to done and update the counts
    //TODO: expand all subtasks
    //TODO: collapse all subtasks
});


//display the stored tasks
function load_tasks(){
    $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: {'event': 'retrieve_tasks'}
    }).done(function(response) {
        if (response.err){
            $('#div_addtask').append(
                '<div class="err">' + response.emsg + '</div>'
            );
        }
        else{
            display_tasks(response.res, 'todo');
        }
    });
}

//display finished tasks
function load_done_tasks(){
    $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: {'event': 'retrieve_done_tasks'}
    }).done(function(response) {
        if (response.err){
            $('#div_addtask').append(
                '<div class="err">' + response.emsg + '</div>'
            );
        }
        else{
            display_tasks(response.res, 'done');
        }

    });

}

function get_counts(){
     $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: {'event': 'retrieve_task_counts'}
     }).done(function(response) {
        if (!response.err){
            if (response.res[0]['_id'] == true){
                $('#count_done').text('('+response.res[0]['number'] + ')');
                $('#count_todo').text('('+response.res[1]['number'] + ')');
            }
            else{
                $('#count_done').text('('+response.res[1]['number'] + ')');
                $('#count_todo').text('('+response.res[0]['number'] + ')');
            }
        }
    });
   
}

// "todo" tasks may include done items, tagged by done=false, done_time > 0
// "done" tasks contain tasks that are done and users prefer to put them 
// in the "done" category, with done=true, done_time > 0
// If a task is not done, done_time = 0
// In the "done" category, it is possible include main tasks that are not "done",
// but part of the subtasks are done
function display_tasks(main_tasks, type){
    $('#div_planlist').html('');
    //sort by date for main tasks
    var task_array = $.map(main_tasks, function(value, index){return [value]});
    task_array.sort(function(a, b){return b.refresh - a.refresh})
    for (var i = 0; i<task_array.length; i++){
        //show the main task
        var ele_main_task = create_main_task(task_array[i], type);
        $('#div_planlist').append(ele_main_task);

        //show the subtasks
        var subtasks = task_array[i].subtasks;
        subtasks.sort(function(a, b){return a.refresh - b.refresh});
        for (var j = 0; j < subtasks.length; j++){
            var ele_subtask = create_subtask(subtasks[j], type, task_array[i]['_id'])
            $('#div_planlist').append(ele_subtask);
        }
    }
    //enable tooltips
    $('[data-toggle="tooltip"]').tooltip();
}

function add_task(param){
     param['event'] = 'add_task';
     $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: param
    }).done(function(response) {
        if (response.err){
            $('#div_addtask').append(
                '<div class="err">' + response.emsg + '</div>'
            );
        }
        else{
            // refresh the to-do list
            load_tasks();
            if (response.task.task_level == 0){
                $('#input_addtask').val('');
            }
            else{
                $('#add_subtask_input_'+response.task.parent).val('');
                //TODO
                //if a main task is "done", added a new subtask, it should be "undone"
                //if (response.task.task_level == 1 && response.task.time_done > 0){
                //} 
            }
        }
    });  
}

function remove_item(to_remove){
    $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: {'to_remove': to_remove, 'event': 'remove_item'}
    }).done(function(response) {
        if (response.err){
            $('#div_addtask').append(
                '<div class="err">' + response.emsg + '</div>'
            );
        }
        else{
            //remove it from UI
            var main_task = ''
            for (var i = 0; i < to_remove.length; i++){
                var ele = $('#' + to_remove[i]);
                ele.remove();
                if (ele.hasClass('main-task'))
                    main_task = to_remove[i]
            }
            //if only done subtasks are left, then the main task is done
            if (main_task != ''){
                //TODO: find all subtasks, check if they are all done
            }    
        }
    });   
}

//Task switch between done/undone status
function change_status(to_change, time_done, area){
    data = {
        'event': 'change_status',
        'to_change': to_change,
        'time_done': time_done,
        //Note: all items in todo area have done=false
        //In archive area, users can only set a done task to undone
        //Once set to undone, it should be removed from the "done" area
        'done': false,
        }
    $.ajax({
        type: "POST",
        url: url_ajax_tasks,
        data: data,
    }).done(function(response) {
        if (response.err){
            $('#div_addtask').append(
                '<div class="err">' + response.emsg + '</div>'
            );
        }
        else{
            if (area == 'archive'){
                //TODO: remove items that are undone
                //for (var i = 0; i < to_change.length; i++)
                //    $('#' + to_change[i]).remove();
                load_done_tasks();
            }
            else{
                load_tasks();
            /*
                for(var i = 0; i<to_change.length; i++){
                    //set the time_done of the changed element
                    $('#' + to_change[i]).attr('time_done', time_done);
                    //change the display of the items in "ToDo"
                    $('#' + to_change[i].addClass('task-done'));
                }
            */
            }
        }
    });
}

//create the main_task element
//type: todo or done
//It's necessary as parameter, as a main task
//can be in the done category but not actually done--
//only part of the subtasks are done
function create_main_task(task, type){
    //show the main task
    var ele_main_task = document.createElement('div');
    ele_main_task.setAttribute('class', 'main-task');
    ele_main_task.setAttribute('id', task['_id']);
    ele_main_task.setAttribute('refresh', task.refresh);
    ele_main_task.setAttribute('time_done', task.time_done);
 
    //Add the input checkbox
    var checkbox = document.createElement('input');
    checkbox.setAttribute('id', 'checkbox_'+task['_id']);
    checkbox.setAttribute('type', 'checkbox');
    //done status
    if (task['time_done'] > 0){
        checkbox.setAttribute('checked', true);
        ele_main_task.className += ' task-done';
    }
    //if a level 0 task is on "done", it can only change from status
    //done to not done, not the other way around, as there are other
    //subtasks that are not done
    if (type == 'done' && task['time_done'] == 0){
        checkbox.disabled = true;    
    }
    ele_main_task.appendChild(checkbox);
    // add content of the task
    var main_task_text = document.createElement('span');
    main_task_text.setAttribute('id', 'main_task_text_'+task['_id']);
    main_task_text.appendChild(document.createTextNode(' '+task.task));
    if (task.subtasks.length > 0){
        main_task_text.setAttribute('class', 'main-task-with-subtask');
    }
    ele_main_task.appendChild(main_task_text);
    //button to add new subtask
    if (type == 'todo'){
        var add_subtask = document.createElement('span');
        add_subtask.setAttribute('id', 'add_subtask_'+task['_id']);
        add_subtask.setAttribute('class', 'add-subtask');
        add_subtask.innerHTML = '<span class="glyphicon glyphicon-plus"></span>';
        add_subtask.setAttribute('data-toggle', 'tooltip');
        add_subtask.setAttribute('title', 'Add a todo for the task');
        ele_main_task.appendChild(add_subtask);
    
        //Add the remove sign
        //If the task is completed, then don't remove it
        if (task.time_done == 0){
            var remove = document.createElement('span');
            remove.setAttribute('id', 'rm_'+task['_id']);
            remove.setAttribute('class', 'glyphicon glyphicon-trash rm-item');
            remove.setAttribute('data-toggle', 'tooltip');
            remove.setAttribute('title', 'Remove this item');
            ele_main_task.appendChild(remove); 
        }
        //Text input area for add subtask, hidden
        var subtask_input_container = document.createElement('div');
        subtask_input_container.setAttribute('class', 'hidden');
        subtask_input_container.setAttribute('id', 'add_subtask_container_'+task['_id']);

        var subtask_input = document.createElement('input');
        subtask_input.setAttribute('id', 'add_subtask_input_'+task['_id']);
        subtask_input.setAttribute('type', 'text');
        subtask_input.setAttribute('placeholder', 'Add a to-do item');
        subtask_input.setAttribute('class', 'form-control subtask-input');

        subtask_input_container.appendChild(subtask_input);
        ele_main_task.appendChild(subtask_input_container); 
    }

    return ele_main_task;
}

function create_subtask(task, type, parent_id){
    var ele_subtask = document.createElement('div');
    ele_subtask.setAttribute('class', 'subtask');
    ele_subtask.setAttribute('id', task['_id']);
    ele_subtask.setAttribute('parent', parent_id);
    ele_subtask.setAttribute('refresh', task.refresh);
    ele_subtask.setAttribute('time_done', task.time_done);
    //Add the input checkbox
    var checkbox = document.createElement('input');
    checkbox.setAttribute('id', 'checkbox_'+task['_id']);
    checkbox.setAttribute('type', 'checkbox');
    if (task['time_done'] > 0){
        checkbox.setAttribute('checked', true);
        ele_subtask.className += ' task-done';
    }
    ele_subtask.appendChild(checkbox);
    //Add the task
    ele_subtask.appendChild(document.createTextNode(' '+task.task));
    // Add the remove sign
    if (type == 'todo'){
        if (task.time_done == 0){
            var remove = document.createElement('span');
            remove.setAttribute('id', 'rm_'+task['_id']);
            remove.setAttribute('class', 'glyphicon glyphicon-trash rm-item');
            remove.setAttribute('data-toggle', 'tooltip');
            remove.setAttribute('title', 'Remove this item');
            ele_subtask.appendChild(remove);
        }
    }
    return ele_subtask;
}
