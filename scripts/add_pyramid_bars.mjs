import fs from 'fs';

let content = fs.readFileSync('src/components/vocab/TodayStudyTab.tsx', 'utf8');

// Tầng 4
content = content.replace(
  `{pyramid.total > 0 ? Math.round((pyramid.level4_strong / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`,
  `{pyramid.total > 0 ? Math.round((pyramid.level4_strong / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-100 dark:bg-emerald-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level4_strong / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`
);

// Tầng 3
content = content.replace(
  `{pyramid.total > 0 ? Math.round((pyramid.level3_good / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`,
  `{pyramid.total > 0 ? Math.round((pyramid.level3_good / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-100 dark:bg-amber-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level3_good / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`
);

// Tầng 2
content = content.replace(
  `{pyramid.total > 0 ? Math.round((pyramid.level2_uncertain / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`,
  `{pyramid.total > 0 ? Math.round((pyramid.level2_uncertain / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-100 dark:bg-orange-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level2_uncertain / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`
);

// Tầng 1
content = content.replace(
  `{pyramid.total > 0 ? Math.round((pyramid.level1_learning / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`,
  `{pyramid.total > 0 ? Math.round((pyramid.level1_learning / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-100 dark:bg-rose-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level1_learning / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`
);

// Tầng 0
content = content.replace(
  `{pyramid.total > 0 ? Math.round((pyramid.level0_new / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`,
  `{pyramid.total > 0 ? Math.round((pyramid.level0_new / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level0_new / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`
);

fs.writeFileSync('src/components/vocab/TodayStudyTab.tsx', content, 'utf8');
console.log('All pyramid tier ratio bars successfully injected.');
